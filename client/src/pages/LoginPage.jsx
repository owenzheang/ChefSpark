import AuthCard from "../components/AuthCard.jsx";
import { loginUser, saveToken } from "../services/api.js";

function LoginPage({ onLogin, onShowRegister }) {
  async function signIn(email, password) {
    const data = await loginUser(email, password);
    saveToken(data.token);
    onLogin();
  }

  return (
    <AuthCard
      title="Cook tonight with what you have."
      subtitle="Sign in to your kitchen."
      submitLabel="Sign in"
      loadingLabel="Signing in…"
      onSubmit={signIn}
      switchPrompt="New to ChefSpark?"
      switchLabel="Create an account"
      onSwitch={onShowRegister}
    />
  );
}

export default LoginPage;
