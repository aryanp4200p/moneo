import ExpenseForm from "../components/ExpenseForm";
import CSVUpload from "../components/CSVUpload";
import CategorizePrompt from "../components/CategorizePrompt";
import TransactionList from "../components/TransactionList";

export default function TransactionsPage() {
  return (
    <div
      className="container"
      style={{
        paddingTop: 32,
        paddingBottom: 60,
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Transactions</h1>

      {/* Expense Form + CSV Upload */}
      <div
        className="grid-2"
        style={{
          marginBottom: 20,
          alignItems: "start",
        }}
      >
        <ExpenseForm />
        <CSVUpload />
      </div>

      {/* AI Categorization */}
      <div
        style={{
          marginBottom: 20,
        }}
      >
        <CategorizePrompt />
      </div>

      {/* Transaction List */}
      <TransactionList />
    </div>
  );
}
