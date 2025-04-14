import { format } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Item } from '../types/ItemTypes';
import { Card } from './ui/card';

interface ItemCardProps {
    item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.location}>{item.location}</Text>
            </View>

            <View style={styles.details}>
                <Text style={styles.time}>
                    {format(new Date(item.startTime), 'h:mm a')} -
                    {format(new Date(item.endTime), 'h:mm a')}
                </Text>
                <Text style={styles.day}>{format(new Date(item.day), 'EEEE')}</Text>
            </View>

            {item.description && (
                <Text style={styles.description}>{item.description}</Text>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    location: {
        fontSize: 14,
        color: '#6B7280',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    time: {
        fontSize: 14,
        color: '#374151',
    },
    day: {
        fontSize: 14,
        color: '#374151',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
}); 