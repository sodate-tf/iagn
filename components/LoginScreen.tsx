"use client";

import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    

    if (email === 'fabiano.sodate@4udevelops.com.br' && password === '1234Abcd') {
         onLoginSuccess(); // pequena animação de login
  } else {
    setError('E-mail ou senha inválidos. Tente novamente.');
}
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <span className="text-3xl font-bold text-primary">P</span>
                <span className="text-3xl font-bold text-white">N</span>
                <span className="text-3xl font-bold text-primary">A</span>
                <span className="text-3xl font-bold text-white">I</span>
            </div>
          <h1 className="text-2xl font-bold text-white">Portal de Geração de Notícias</h1>
          <p className="mt-2 text-gray-400">Faça login para continuar</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="E-mail"
              />
            </div>
            <div>
              <label htmlFor="password"className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
            </div>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-center text-red-300 bg-red-800/50 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-indigo-300 group-hover:text-indigo-200" aria-hidden="true" />
              </span>
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;