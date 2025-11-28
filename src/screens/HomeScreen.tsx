import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { supabase } from '../lib/supabase'; // Ajuste o caminho

export default function HomeScreen() {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Erro ao sair:', error.message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo, Motorista!</Text>
      <Text>Esta é a tela principal do aplicativo.</Text>
      <Button title="Sair" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
