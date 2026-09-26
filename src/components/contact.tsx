'use client';
import { useState } from 'react';
import { Field } from './ui';
export function ContactForm({ newsletter = false }: { newsletter?: boolean }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const form = new FormData(e.currentTarget);
        try {
          const response = await fetch(newsletter ? '/api/newsletter' : '/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...Object.fromEntries(form),
              ...(newsletter ? { consent: form.get('consent') === 'on' } : {}),
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setMessage(
            newsletter
              ? 'You’re on the list. Thank you.'
              : 'Your message has been saved for our team. Thank you.',
          );
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Please try again.');
        } finally {
          setPending(false);
        }
      }}
    >
      {!newsletter && <Field name="full_name" label="Your name" required />}
      <Field name="email" label="Email address" type="email" required />
      {newsletter ? (
        <label className="small">
          <input type="checkbox" name="consent" required /> I agree to receive collection updates
          from YAQEEN.
        </label>
      ) : (
        <Field name="message" label="How can we help?">
          <textarea name="message" required minLength={10} maxLength={5000} />
        </Field>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Saving…' : newsletter ? 'Join the list' : 'Send message'}
      </button>
    </form>
  );
}
