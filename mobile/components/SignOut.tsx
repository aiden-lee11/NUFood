import { signOut } from 'firebase/auth';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useBanner } from '../context/BannerContext';
import { auth } from '../firebase';
import { Button } from './ui/button';

export function SignOut() {
    const { showBanner } = useBanner();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            showBanner('Successfully signed out', 'success');
        } catch (error) {
            showBanner('Failed to sign out', 'error');
        }
    };

    return (
        <View style={styles.container}>
            <Button
                onPress={handleSignOut}
                variant="outline"
                style={styles.button}
            >
                Sign Out
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    button: {
        width: '100%',
    },
}); 