import SignupForm from "../components/SignupForm";

function SignupPage() {
  return (
    <div className="auth-layout">
      <div className="card">
        <h1>Create Account</h1>
        <p className="helper-text">Use your email and password to get started.</p>
        <SignupForm />
      </div>
    </div>
  );
}

export default SignupPage;
