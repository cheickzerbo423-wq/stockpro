// src/pages/ForcePassword.jsx — Écran de changement de mot de passe obligatoire
// Affiché à la place de toute autre page tant que user.must_change_password
// est vrai (nouvelle politique de mot de passe renforcée déployée sur la
// plateforme). L'utilisateur doit définir un nouveau mot de passe conforme
// avant de pouvoir continuer.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services";
import { Input, Btn, PasswordRules } from "../components/UI";
import { isPasswordValid, PASSWORD_HINT } from "../utils/passwordPolicy";

const WiLogo = ({ size = 52 }) => (
  <svg viewBox="555 550 1372 1380" width={size} height={size}
       style={{ flexShrink: 0, fillRule: "evenodd", clipRule: "evenodd" }}>
    <path d="M1921.296,898.435l0,683.444c0,189.808 -154.1,343.908 -343.908,343.908l-674.461,0c-189.808,0 -343.908,-154.1 -343.908,-343.908l0,-683.444c0,-189.808 154.1,-343.908 343.908,-343.908l674.461,0c189.808,0 343.908,154.1 343.908,343.908Z" fill="#0023ff"/>
    <ellipse cx="1569.466" cy="974.341" rx="113.239" ry="117.957" fill="#fff900"/>
    <path d="M1121.277,1160.585l0,164.319c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-156.512l0.511,0.155Z" fill="#fff"/>
    <path d="M1121.277,905.88l0,419.025c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-403.1c0,-2.698 0.174,-5.356 0.511,-7.962Z" fill="#fff"/>
    <path d="M1448.414,1149.957c10.344,-14.463 27.279,-23.898 46.4,-23.898l129.693,0c31.464,0 57.009,25.545 57.009,57.009l0,111.803c0,10.837 -3.03,20.972 -8.29,29.603c5.406,19.518 8.29,40.031 8.29,61.191c0,130.211 -109.178,235.926 -243.655,235.926c-79.644,0 -150.414,-37.081 -194.886,-94.37c-44.471,57.289 -115.242,94.37 -194.886,94.37c-134.477,0 -243.655,-105.715 -243.655,-235.926c-0,-15.783 1.604,-31.206 4.663,-46.124c-2.768,-6.997 -4.29,-14.622 -4.29,-22.599l0,-403.1c0,-33.956 27.568,-61.525 61.525,-61.525l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,446.257c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l0,-454.219c3.91,-30.201 29.755,-53.562 61.013,-53.562l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,246.804l0.572,-0.174l0,199.627c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l-0,-177.031c0,-12.343 3.931,-23.775 10.608,-33.111Z" fill="#fff"/>
  </svg>
);

export default function ForcePasswordChange() {
  const { user, updateUser, logout } = useAuth();
  const [mdpActuel,    setMdpActuel]    = useState("");
  const [nouveauMdp,   setNouveauMdp]   = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!mdpActuel || !nouveauMdp || !confirmation)
      return setError("Tous les champs sont obligatoires.");
    if (!isPasswordValid(nouveauMdp))
      return setError(PASSWORD_HINT);
    if (nouveauMdp !== confirmation)
      return setError("La confirmation ne correspond pas au nouveau mot de passe.");
    if (nouveauMdp === mdpActuel)
      return setError("Le nouveau mot de passe doit être différent de l'ancien.");

    setLoading(true);
    try {
      await authService.changePassword(mdpActuel, nouveauMdp);
      updateUser({ must_change_password: false });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gray-50"
      style={{ fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <WiLogo size={44} />
          <div>
            <div className="text-2xl font-black text-gray-900">WariGest</div>
            <div className="text-xs text-gray-400 font-medium">Gestion & Facturation</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl bg-amber-50 border border-amber-100">
              🔒
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-snug">Mise à jour de sécurité requise</h1>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {user?.login ? <>Bonjour <strong className="text-gray-700">{user.login}</strong>, </> : ""}
                pour renforcer la sécurité de votre compte, vous devez définir un nouveau mot de passe avant de continuer.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Mot de passe actuel *" type="password" value={mdpActuel}
              onChange={(e) => setMdpActuel(e.target.value)} placeholder="Votre mot de passe actuel" />
            <Input label="Nouveau mot de passe *" type="password" value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)} placeholder="8 caractères minimum" />
            <PasswordRules value={nouveauMdp} />
            <Input label="Confirmer le nouveau mot de passe *" type="password" value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)} placeholder="Retapez le nouveau mot de passe" />

            <div className="flex justify-end gap-2 pt-2">
              <Btn color="gray" onClick={logout} type="button">Se déconnecter</Btn>
              <Btn type="submit" loading={loading}>Définir le nouveau mot de passe</Btn>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs font-medium mt-6">
          WariGest — Politique de mot de passe renforcée
        </p>
      </div>
    </div>
  );
}
