import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return Alert.alert('Sign up failed', error.message);

    Alert.alert(
      'Account created',
      'If email confirmation is enabled, check your inbox before logging in.'
    );
    router.replace('/(auth)/login');
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Create account</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <Pressable
        onPress={onRegister}
        disabled={loading}
        style={{
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          alignItems: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: '600' }}>{loading ? 'Creating…' : 'Create account'}</Text>
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable style={{ padding: 8, alignItems: 'center' }}>
          <Text>Back to login</Text>
        </Pressable>
      </Link>
    </View>
  );
}
