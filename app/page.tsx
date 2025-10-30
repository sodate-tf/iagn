"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginScreen from "../components/LoginScreen";
import { useAuth } from "../context/AuthContext";

const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // 🔹 controla o carregamento inicial

  useEffect(() => {
    const storedAuth = localStorage.getItem("pnaiai_auth");

    if (storedAuth === "true") {
      login(); // Atualiza o contexto imediatamente
      router.replace("/dashboard"); // 🔹 redireciona antes de renderizar o login
    } else {
      setIsCheckingAuth(false); // 🔹 libera renderização do login
    }
  }, [login, router]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLoginSuccess = () => {
    localStorage.setItem("pnaiai_auth", "true");
    login();
    router.replace("/dashboard");
  };

  // 🔹 Mostra tela de carregamento durante checagem
  if (isCheckingAuth || isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Redirecionando...
      </div>
    );
  }

  // 🔹 Só mostra login se o usuário realmente não estiver logado
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
};

export default LoginPage;
