import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export function Button({
    onPress,
    children,
    variant = 'default',
    size = 'md',
    loading = false,
    disabled = false,
    style,
    textStyle,
}: ButtonProps) {
    const buttonStyles = [
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`${variant}Text`],
        textStyle,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={buttonStyles}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'default' ? '#fff' : '#000'} />
            ) : (
                <Text style={textStyles}>{children}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: '500',
    },
    // Variants
    default: {
        backgroundColor: '#0EA5E9',
    },
    defaultText: {
        color: '#ffffff',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#0EA5E9',
    },
    outlineText: {
        color: '#0EA5E9',
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: '#0EA5E9',
    },
    // Sizes
    sm: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    md: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    lg: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    disabled: {
        opacity: 0.5,
    },
}); 