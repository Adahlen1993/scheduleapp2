// app/(auth)/login.tsx
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    const e = email.trim();

    if (!e || !password) {
      Alert.alert('Missing info', 'Enter email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
Alert.alert('Logged in ✅', `User: ${e}`);

    // Temporary: Step 1 routing. Step 3 will handle routing via session.
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScheduleApp</Text>
      <Text style={styles.subtitle}>Log in</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.6 }]}
      >
        <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      <Link href="/(auth)/register" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkText}>Create an account</Text>
        </Pressable>
      </Link>
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 18, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: { fontWeight: '600' },
  linkBtn: { padding: 10, alignItems: 'center' },
  linkText: { textDecorationLine: 'underline' },
});
