import LoginForm from "../components/LoginForm";

function LoginPage() {
  return (
    <div className="auth-layout">
      <div className="card">
        <h1>Task Pilot</h1>
        <p className="helper-text">Log in to manage your tasks.</p>
        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;
