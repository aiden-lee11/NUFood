import Icon from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function HeaderControls() {
    const router = useRouter();
    const { user } = useAuth();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => router.push('/preferences')}
                style={styles.button}
            >
                <Icon name="settings" size={24} color="#374151" />
            </TouchableOpacity>

            {user ? (
                <TouchableOpacity
                    onPress={() => router.push('/signout')}
                    style={styles.button}
                >
                    <Icon name="log-out" size={24} color="#374151" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={() => router.push('/login')}
                    style={styles.button}
                >
                    <Icon name="log-in" size={24} color="#374151" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        padding: 8,
        marginLeft: 8,
    },
}); 