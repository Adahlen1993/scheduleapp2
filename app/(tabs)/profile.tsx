import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { supabase } from '../../src/lib/supabase';
import { useSessionStore } from '../../src/store/session';

const ProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipcode: z.string().optional(),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

export default function ProfileScreen() {
  const user = useSessionStore((s) => s.user);

const {
  control,
  handleSubmit,
  reset,
  formState: { isSubmitting },
} = useForm<ProfileForm>({
  resolver: zodResolver(ProfileSchema),
  defaultValues: {
    first_name: '',
    last_name: '',
    street_address: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
  },
});


  // Load profile on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,last_name,street_address,city,state,country,zipcode')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        Alert.alert('Failed to load profile', error.message);
        return;
      }

      if (data) {
        reset({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          street_address: data.street_address ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          country: data.country ?? '',
          zipcode: data.zipcode ?? '',
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, reset]);

  async function onSave(values: ProfileForm) {
    if (!user) return;

    const payload = {
      id: user.id,
      email: user.email, // convenience column (optional)
      ...values,
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    Alert.alert('Saved ✅', 'Your profile has been updated.');
  }

function Field({
  label,
  name,
  placeholder,
  control,
}: {
  label: string;
  name: keyof ProfileForm;
  placeholder?: string;
  control: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value ?? ''}
            onChangeText={onChange}
            placeholder={placeholder}
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          />
        )}
      />
    </View>
  );
}


  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Profile</Text>

     <Field
  label="First name"
  name="first_name"
  placeholder="Alex"
  control={control}
/>

   <Field
  label="Last name"
  name="last_name"
  placeholder="Dahlen"
  control={control}
/>

<Field
  label="Street address"
  name="street_address"
  placeholder="123 Main St"
  control={control}
/>

      <Field label="City" name="city" placeholder="Chicago" control={control} />
      <Field label="State" name="state" placeholder="IL" control={control} />
      <Field label="Country" name="country" placeholder="USA" control={control} />
      <Field label="Zip code" name="zipcode" placeholder="60601" control={control} />

      <Pressable
        onPress={handleSubmit(onSave)}
        disabled={isSubmitting}
        style={{
          padding: 12,
          borderWidth: 1,
          borderRadius: 10,
          alignItems: 'center',
          opacity: isSubmitting ? 0.6 : 1,
          marginTop: 8,
        }}
      >
        <Text style={{ fontWeight: '600' }}>{isSubmitting ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
    </ScrollView>
  );
}
