import React, { useState } from 'react';
// Import Image and StatusBar for a better dark mode experience
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, StatusBar } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

// Assuming the logo is named logo.png and is in the assets folder
// The path is relative from this file's location
import AppLogo from '../../../assets/logo.png';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erro no Login', error.message);
    } else {
      navigation.navigate('Deliveries' as never);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Use light-content for the status bar on a dark background */}
      <StatusBar barStyle="light-content" />

      {/* Logo e Título */}
      <View style={styles.logoContainer}>
        <Image source={AppLogo} style={styles.logo} />
        <Text style={styles.appName}>LogiTrack</Text>
      </View>

      {/* Cartão de Login */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.welcomeText}>Bem-vindo de volta</Text>
          <Text style={styles.subtitleText}>Faça login para continuar</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.icon}>✉️</Text>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              placeholder="Email"
              placeholderTextColor="#9ca3af" // gray-400
              autoCapitalize={'none'}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.icon}>🔒</Text>
            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              placeholder="Senha"
              placeholderTextColor="#9ca3af" // gray-400
              autoCapitalize={'none'}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000', // Black background
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1f2937', // gray-800
    borderRadius: 24,
    padding: 30,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff', // White text
    marginBottom: 5,
  },
  subtitleText: {
    color: '#d1d5db', // gray-300
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151', // gray-700
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  icon: {
    marginRight: 10,
    fontSize: 20,
    color: '#9ca3af', // gray-400
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff', // White input text
    fontSize: 16,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#8b5cf6', // Purple
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#583c9c',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});