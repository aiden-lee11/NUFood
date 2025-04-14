import Icon from '@expo/vector-icons/Feather';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Input } from './ui/input';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
    return (
        <View style={styles.container}>
            <Icon name="search" size={20} color="#6B7280" style={styles.icon} />
            <Input
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                style={styles.input}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    icon: {
        marginLeft: 12,
    },
    input: {
        flex: 1,
        borderWidth: 0,
    },
}); 