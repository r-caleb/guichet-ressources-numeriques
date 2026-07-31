'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Wand2 } from 'lucide-react';

type TemporaryPasswordFieldProps = {
  label: string;
  name?: string;
};

const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%&*?';

function randomIndex(length: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function pick(characters: string) {
  return characters[randomIndex(characters.length)];
}

function shuffle(value: string) {
  const characters = value.split('');

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

function generateTemporaryPassword() {
  const all = `${LOWERCASE}${UPPERCASE}${NUMBERS}${SYMBOLS}`;
  const requiredCharacters = [pick(LOWERCASE), pick(UPPERCASE), pick(NUMBERS), pick(SYMBOLS)];
  const remainingCharacters = Array.from({ length: 8 }, () => pick(all));

  return shuffle([...requiredCharacters, ...remainingCharacters].join(''));
}

export function TemporaryPasswordField({ label, name = 'password' }: TemporaryPasswordFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;

    function handleReset() {
      setPassword('');
      setIsVisible(false);
      setIsCopied(false);
    }

    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, []);

  async function copyPassword() {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  }

  function handleGeneratePassword() {
    setPassword(generateTemporaryPassword());
    setIsVisible(true);
    setIsCopied(false);
  }

  return (
    <div className="field password-field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="password-control">
        <input
          ref={inputRef}
          id={inputId}
          className="control"
          name={name}
          type={isVisible ? 'text' : 'password'}
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="icon-action"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          title={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
        <button
          className="icon-action"
          type="button"
          onClick={handleGeneratePassword}
          title="Générer un mot de passe"
          aria-label="Générer un mot de passe"
        >
          <Wand2 size={17} aria-hidden="true" />
        </button>
        <button
          className="icon-action"
          type="button"
          onClick={copyPassword}
          disabled={!password}
          title="Copier le mot de passe"
          aria-label="Copier le mot de passe"
        >
          {isCopied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
