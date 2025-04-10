import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContexts';

// PrimeReact imports
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

interface PasswordUpdateProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    showCancelButton?: boolean;
}

export default function PasswordUpdate({ onSuccess, onCancel, showCancelButton = false }: PasswordUpdateProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate passwords
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            await updatePassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-fluid">
            <div className="field mb-4">
                <label htmlFor="newPassword" className="font-medium mb-2 block">New Password</label>
                <Password
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    toggleMask
                    feedback={false}
                    className="w-full"
                    inputClassName="w-full"
                    required
                />
            </div>

            <div className="field mb-4">
                <label htmlFor="confirmPassword" className="font-medium mb-2 block">Confirm New Password</label>
                <Password
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    toggleMask
                    feedback={false}
                    className="w-full"
                    inputClassName="w-full"
                    required
                />
            </div>

            {error && (
                <Message severity="error" text={error} className="w-full mb-4" />
            )}

            <div className="flex gap-2">
                <Button
                    type="submit"
                    label="Update Password"
                    icon="pi pi-check"
                    loading={loading}
                    className="p-button-primary"
                    disabled={loading}
                />

                {showCancelButton && (
                    <Button
                        type="button"
                        label="Cancel"
                        icon="pi pi-times"
                        className="p-button-outlined"
                        onClick={onCancel}
                    />
                )}
            </div>
        </form>
    );
} 