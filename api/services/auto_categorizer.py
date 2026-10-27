import re


# ============================================================
# CATEGORY KEYWORDS
# ============================================================

CATEGORY_KEYWORDS = {
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
        "blinkit",
        "zepto",
        "instamart",
    ],

    "Shopping": [
        "amazon",
        "flipkart",
        "myntra",
        "meesho",
        "shopping",
        "mall",
        "store",
        "retail",
        "ajio",
    ],

    "Transport": [
        "uber",
        "ola",
        "rapido",
        "petrol",
        "fuel",
        "hp petrol",
        "indian oil",
        "bharat petroleum",
        "parking",
        "metro",
        "bus",
        "train",
        "irctc",
    ],

    "Entertainment": [
        "netflix",
        "prime video",
        "hotstar",
        "spotify",
        "youtube premium",
        "movie",
        "cinema",
        "pvr",
        "inox",
        "bookmyshow",
        "game",
    ],

    "Utilities": [
        "electricity",
        "electric bill",
        "water bill",
        "gas bill",
        "internet",
        "broadband",
        "wifi",
        "jio fiber",
        "airtel xstream",
        "maintenance",
    ],

    "Bills": [
        "mobile recharge",
        "recharge",
        "phone bill",
        "mobile bill",
        "airtel",
        "jio",
        "vi recharge",
        "vodafone",
    ],

    "Healthcare": [
        "medical",
        "medicine",
        "pharmacy",
        "apollo",
        "hospital",
        "doctor",
        "clinic",
        "healthcare",
        "diagnostic",
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
        "fees",
    ],

    "Income": [
        "salary",
        "freelance payment",
        "freelance",
        "income",
        "bonus",
        "payroll",
        "stipend",
        "salary credit",
    ],

    "Cash": [
        "atm cash withdrawal",
        "cash withdrawal",
        "atm withdrawal",
        "cash",
    ],

    "Investment": [
        "investment",
        "mutual fund",
        "sip",
        "stocks",
        "shares",
        "zerodha",
        "groww",
        "upstox",
        "portfolio",
    ],
}


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize_text(value: str | None) -> str:
    """
    Normalize merchant/note text before keyword matching.

    Example:
        "Amazon.in - Order #123"
        becomes:
        "amazon in order 123"
    """

    if not value:
        return ""

    value = str(value).lower().strip()

    # Replace punctuation/special characters with spaces
    value = re.sub(r"[^a-z0-9\s]", " ", value)

    # Remove extra spaces
    value = re.sub(r"\s+", " ", value)

    return value


# ============================================================
# AUTO CATEGORIZE
# ============================================================

def auto_categorize(
    merchant: str | None = None,
    note: str | None = None,
    transaction_type: str | None = None,
) -> str | None:
    """
    Automatically categorizes a transaction using
    merchant and note information.

    Returns:
        Category name if a keyword matches.
        None if no reliable category is found.
    """

    # Combine merchant + note
    text = normalize_text(
        f"{merchant or ''} {note or ''}"
    )

    # Nothing to analyze
    if not text:
        return None

    # --------------------------------------------------------
    # INCOME
    # --------------------------------------------------------
    # If the transaction is income, check income keywords
    # first so "salary" is not treated as something else.

    if transaction_type == "income":
        for keyword in CATEGORY_KEYWORDS["Income"]:
            normalized_keyword = normalize_text(keyword)

            if normalized_keyword in text:
                return "Income"

    # --------------------------------------------------------
    # OTHER CATEGORIES
    # --------------------------------------------------------

    for category, keywords in CATEGORY_KEYWORDS.items():

        # Income has already been checked above
        if category == "Income":
            continue

        for keyword in keywords:
            normalized_keyword = normalize_text(keyword)

            if normalized_keyword in text:
                return category

    # --------------------------------------------------------
    # UNKNOWN TRANSACTION
    # --------------------------------------------------------

    return None