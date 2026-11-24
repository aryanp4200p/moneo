import re

# ============================================================
# CATEGORY KEYWORDS
# ============================================================
# Ordered from most specific to broadest so specific merchants
# (e.g. "Apollo Medical Store") match before generic words.

CATEGORY_KEYWORDS = {
    "Income": [
        "salary credit",
        "salary",
        "freelance payment",
        "freelance",
        "income",
        "bonus",
        "payroll",
        "stipend",
        "dividend",
        "interest credit",
        "int pd",
        "refund",
        "cashback",
    ],
    "Healthcare": [
        "medical store",
        "medical",
        "medicine",
        "pharmacy",
        "apollo",
        "medplus",
        "pharmeasy",
        "1mg",
        "hospital",
        "doctor",
        "clinic",
        "healthcare",
        "diagnostic",
        "pathology",
        "pathology lab",
        "diagnostic lab",
    ],
    "Utilities": [
        "electricity",
        "electric bill",
        "mahavitaran",
        "bescom",
        "tata power",
        "adani electricity",
        "water bill",
        "gas bill",
        "mahanagar gas",
        "indraprastha gas",
        "internet",
        "broadband",
        "wifi",
        "jio fiber",
        "airtel xstream",
        "act fibernet",
        "maintenance",
    ],
    "Transport": [
        "uber",
        "ola",
        "rapido",
        "petrol",
        "fuel",
        "hp petrol",
        "hpcl",
        "indian oil",
        "iocl",
        "bharat petroleum",
        "bpcl",
        "parking",
        "fastag",
        "metro",
        "bus",
        "train",
        "irctc",
        "redbus",
        "makemytrip",
    ],
    "Food": [
        "swiggy",
        "zomato",
        "restaurant",
        "food",
        "dominos",
        "pizza hut",
        "mcdonald",
        "mcdonalds",
        "kfc",
        "starbucks",
        "cafe",
        "bakery",
        "blinkit",
        "zepto",
        "instamart",
        "bigbasket",
    ],
    "Entertainment": [
        "netflix",
        "prime video",
        "amazon prime",
        "hotstar",
        "disney",
        "spotify",
        "youtube premium",
        "movie",
        "cinema",
        "pvr",
        "inox",
        "bookmyshow",
        "gaming",
        "steam",
        "playstation",
    ],
    "Education": [
        "college",
        "school",
        "university",
        "tuition",
        "course",
        "udemy",
        "coursera",
        "education",
        "exam fee",
        "school fees",
        "college fees",
    ],
    "Cash": [
        "atm cash withdrawal",
        "atm withdrawal",
        "cash withdrawal",
        "atm wdl",
        "atw",
        "nwd",
        "self withdrawal",
    ],
    "Investment": [
        "investment",
        "mutual fund",
        "sip",
        "stocks",
        "shares",
        "zerodha",
        "zerodha coin",
        "groww",
        "upstox",
        "angel one",
        "kuvera",
        "ppf",
        "nps",
        "portfolio",
    ],
    "Bills": [
        "mobile recharge",
        "prepaid recharge",
        "postpaid",
        "recharge",
        "phone bill",
        "mobile bill",
        "airtel",
        "jio",
        "vi recharge",
        "vodafone",
        "bsnl",
        "dth",
        "tata play",
    ],
    "Shopping": [
        "amazon",
        "flipkart",
        "myntra",
        "meesho",
        "shopping",
        "mall",
        "ajio",
        "nykaa",
        "tata cliq",
        "dmart",
        "reliance retail",
        "department store",
        "general store",
    ],
}


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize_text(value: str | None) -> str:
    """
    Normalize bank particulars/merchant/note text before keyword matching.

    Example:
        "UPI/412398765/SWIGGY-Order#123"
        becomes:
        "upi 412398765 swiggy order 123"
    """
    if not value:
        return ""

    value = str(value).lower().strip()

    # Replace punctuation/slashes/underscores with spaces
    value = re.sub(r"[^a-z0-9\s]", " ", value)

    # Collapse multiple spaces
    value = re.sub(r"\s+", " ", value)

    return value.strip()


# Precompile word-boundary patterns sorted by longest keyword first
# so multi-word phrases ("jio fiber", "atm withdrawal") match before single words ("jio")
_COMPILED_PATTERNS: dict[str, list[re.Pattern]] = {
    category: [
        re.compile(rf"\b{re.escape(normalize_text(kw))}\b")
        for kw in sorted(keywords, key=len, reverse=True)
        if normalize_text(kw)
    ]
    for category, keywords in CATEGORY_KEYWORDS.items()
}


# ============================================================
# AUTO CATEGORIZE
# ============================================================

def auto_categorize(
    merchant: str | None = None,
    note: str | None = None,
    transaction_type: str | None = None,
    particulars: str | None = None,
) -> str | None:
    """
    Automatically categorizes a transaction using particulars, merchant,
    and note information with whole-word matching.

    Supports transaction_type values: "income", "credit", "expense", "debit", or None.
    """
    text = normalize_text(
        f"{particulars or ''} {merchant or ''} {note or ''}"
    )

    if not text:
        return None

    tx_type = (transaction_type or "").lower().strip()
    is_credit = tx_type in ("income", "credit")
    is_debit = tx_type in ("expense", "debit")

    # --------------------------------------------------------
    # 1. CHECK INCOME FOR CREDITS / UNKNOWN TYPE
    # --------------------------------------------------------
    if is_credit or not is_debit:
        for pattern in _COMPILED_PATTERNS["Income"]:
            if pattern.search(text):
                return "Income"

    # --------------------------------------------------------
    # 2. CHECK ALL EXPENSE / GENERAL CATEGORIES
    # --------------------------------------------------------
    for category, patterns in _COMPILED_PATTERNS.items():
        if category == "Income":
            continue

        for pattern in patterns:
            if pattern.search(text):
                return category

    return None