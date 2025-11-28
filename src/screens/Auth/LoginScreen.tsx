import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native'; // Importar useNavigation

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation(); // Hook de navegação

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      // Navegar para a tela de entregas após o login bem-sucedido
      navigation.navigate('Deliveries' as never); // 'as never' para evitar erro de tipo se necessário
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Logo e Título */}
      <View style={styles.logoContainer}>
        {/* Ícone de caminhão - usando placeholder de texto */}
        <Text style={styles.truckIcon}>🚚</Text>
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
          {/* Campo de Email */}
          <View style={styles.inputWrapper}>
            {/* Ícone de email - usando placeholder de texto */}
            <Text style={styles.icon}>✉️</Text>
            <TextInput
              style={styles.input}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="Email"
              autoCapitalize={'none'}
              keyboardType="email-address"
            />
          </View>

          {/* Campo de Senha */}
          <View style={styles.inputWrapper}>
            {/* Ícone de senha - usando placeholder de texto */}
            <Text style={styles.icon}>🔒</Text>
            <TextInput
              style={styles.input}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Senha"
              autoCapitalize={'none'}
            />
          </View>

          {/* Botão de Login */}
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
    flex: 1, // Para preencher a tela inteira e permitir o gradiente
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6a0dad', // Cor de fundo sólida para simular o gradiente inicialmente
    paddingHorizontal: 20, // Espaçamento lateral
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
  },
  truckIcon: {
    fontSize: 48,
    color: '#fff',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // white/90
    borderRadius: 24, // rounded-3xl
    padding: 30,
    // sombra: shadow-2xl -> mais complexo no RN, simplificado para elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    // Borda (simulando border border-white/20)
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748', // slate-800
    marginBottom: 5,
  },
  subtitleText: {
    color: '#718096', // slate-500
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // slate-50
    borderRadius: 12, // rounded-xl
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  icon: {
    marginRight: 10,
    fontSize: 20,
    color: '#a0aec0', // slate-400
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#2d3748',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#8b5cf6', // from-purple-600
    borderRadius: 12, // rounded-xl
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    // Sombra para TouchableOpacity (simulando shadow-lg)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});