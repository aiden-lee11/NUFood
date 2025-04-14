import { format } from 'date-fns';
import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DailyItem } from '../types/ItemTypes';
import { Card } from './ui/card';

interface DailyItemAccordionProps {
    day: string;
    items: DailyItem[];
}

export function DailyItemAccordion({ day, items }: DailyItemAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const rotateAnimation = new Animated.Value(isExpanded ? 1 : 0);

    const toggleAccordion = () => {
        setIsExpanded(!isExpanded);
        Animated.spring(rotateAnimation, {
            toValue: isExpanded ? 0 : 1,
            useNativeDriver: true,
        }).start();
    };

    const rotate = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <Card style={styles.card}>
            <TouchableOpacity onPress={toggleAccordion} style={styles.header}>
                <Text style={styles.dayText}>{format(new Date(day), 'EEEE, MMMM d')}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Text style={styles.arrow}>▼</Text>
                </Animated.View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.content}>
                    {items.map((item, index) => (
                        <View key={`${item.Name}-${index}`} style={[styles.item, index > 0 && styles.itemBorder]}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemName}>{item.Name}</Text>
                                <Text style={styles.itemLocation}>{item.Location}</Text>
                            </View>
                            <Text style={styles.itemTime}>
                                {item.TimeOfDay}
                            </Text>
                            {item.Description && (
                                <Text style={styles.itemDescription}>{item.Description}</Text>
                            )}
                        </View>
                    ))}
                </View>
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
        padding: 16,
    },
    dayText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    arrow: {
        fontSize: 16,
        color: '#6B7280',
    },
    content: {
        padding: 16,
        paddingTop: 0,
    },
    item: {
        paddingVertical: 12,
    },
    itemBorder: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginTop: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    itemLocation: {
        fontSize: 14,
        color: '#6B7280',
    },
    itemTime: {
        fontSize: 14,
        color: '#6B7280',
    },
    itemDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
}); 