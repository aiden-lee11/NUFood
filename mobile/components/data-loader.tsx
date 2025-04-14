import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDataStore } from '../store';

interface DataLoaderProps {
    children: React.ReactNode;
}

export function DataLoader({ children }: DataLoaderProps) {
    const { user } = useAuth();
    const { fetchAllData, fetchGeneralData, loading } = useDataStore();

    useEffect(() => {
        if (user) {
            fetchAllData(user.getIdToken());
        } else {
            fetchGeneralData();
        }
    }, [user, fetchAllData, fetchGeneralData]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 