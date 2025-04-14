import React from 'react';
import { StyleSheet, TextInput, TextStyle, ViewStyle } from 'react-native';

interface InputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: ViewStyle;
    inputStyle?: TextStyle;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export function Input({
    value,
    onChangeText,
    placeholder,
    style,
    inputStyle,
    secureTextEntry,
    keyboardType = 'default',
}: InputProps) {
    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={[styles.input, style, inputStyle]}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            placeholderTextColor="#9CA3AF"
        />
    );
}

const styles = StyleSheet.create({
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        color: '#000000',
    },
}); 