"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-black">Connectez-vous à votre compte</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#FFD100', // brand-yellow
                  brandAccent: '#E0B800', // darker yellow for hover
                  inputBackground: '#EDEBDF', // brand-cream
                  inputBorder: '#D6D6D6', // brand-gray
                  inputBorderHover: '#FFD100',
                  inputBorderFocus: '#FFD100',
                  inputText: '#000000',
                  defaultButtonBackground: '#FFD100',
                  defaultButtonBackgroundHover: '#E0B800',
                  defaultButtonBorder: '#FFD100',
                  defaultButtonText: '#000000',
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin + '/dashboard'}
        />
      </div>
    </div>
  );
};

export default Login;