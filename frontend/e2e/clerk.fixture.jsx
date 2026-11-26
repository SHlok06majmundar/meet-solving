// Used only by the separate Playwright Vite server. Never imported by the production entry point.
function currentUser() {
  if (localStorage.getItem("e2e-signed-out") === "true") return null;
  return {
    id: localStorage.getItem("e2e-user-id") || "user_e2e_alice",
    firstName: "Alex",
    fullName: "Alex Morgan",
    username: "alex",
    imageUrl: "",
  };
}
const getToken = async () => (currentUser() ? `e2e:${currentUser().id}` : null);
const signOut = async () => {
  localStorage.setItem("e2e-signed-out", "true");
  window.location.href = "/";
};
export const useUser = () => ({ user: currentUser(), isLoaded: true });
export const useAuth = () => ({
  userId: currentUser()?.id,
  isLoaded: true,
  isSignedIn: Boolean(currentUser()),
  getToken,
});
export const useClerk = () => ({ signOut, openSignIn: () => {} });
export function ClerkProvider({ children }) {
  return children;
}
export function Show({ when, children }) {
  return (when === "signed-in") === Boolean(currentUser()) ? children : null;
}
export function SignIn() {
  return (
    <section aria-label="Sign in">
      <h2>Sign in to Nexus Meet</h2>
      <p>Authentication fixture for local browser testing.</p>
    </section>
  );
}
