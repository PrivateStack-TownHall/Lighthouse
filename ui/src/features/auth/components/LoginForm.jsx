import { useState } from 'react';
import { KeyRound, Mail, LogIn } from 'lucide-react';
import { Field } from '../../../components/ui/Field.jsx';
import { Input } from '../../../components/ui/inputs.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { toastMessageFor } from '../../../lib/error-messages.js';
import { useLogin } from '../hooks.js';

export function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const loginMutation = useLogin();
  const submit = (e) => { e.preventDefault(); loginMutation.mutate(form); };
  const error = loginMutation.error && toastMessageFor(loginMutation.error, { UNAUTHORIZED: 'Wrong email or password.' });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" required>
        {(p) => <Input {...p} type="email" autoComplete="username" icon={Mail} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />}
      </Field>
      <Field label="Password" required>
        {(p) => <Input {...p} type="password" autoComplete="current-password" icon={KeyRound} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
      </Field>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" icon={LogIn} loading={loginMutation.isPending} disabled={!form.email || !form.password}>Sign in</Button>
    </form>
  );
}
