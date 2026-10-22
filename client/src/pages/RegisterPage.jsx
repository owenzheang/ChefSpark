import AuthCard from "../components/AuthCard.jsx";
import { registerUser, saveToken } from "../services/api.js";

function RegisterPage({ onRegister, onShowLogin }) {
  async function signUp(email, password) {
    const data = await registerUser(email, password);
    saveToken(data.token);
    onRegister();
  }

  return (
    <AuthCard
      title="Your kitchen, remembered."
      subtitle="Create an account to save what you have and the dishes you love."
      submitLabel="Create account"
      loadingLabel="Creating account…"
      onSubmit={signUp}
      switchPrompt="Already cooking with us?"
      switchLabel="Sign in"
      onSwitch={onShowLogin}
    />
  );
}

export default RegisterPage;
