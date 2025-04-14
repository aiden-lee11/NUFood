import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Column {
    key: string;
    title: string;
}

interface TableProps {
    data: any[];
    columns: Column[];
}

export function Table({ data, columns }: TableProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    {columns.map((column) => (
                        <View key={column.key} style={styles.headerCell}>
                            <Text style={styles.headerText}>{column.title}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.body}>
                    {data.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.row}>
                            {columns.map((column) => (
                                <View key={column.key} style={styles.cell}>
                                    <Text style={styles.cellText}>{row[column.key]}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    header: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerCell: {
        padding: 12,
        minWidth: 100,
    },
    headerText: {
        fontWeight: '600',
        color: '#374151',
    },
    body: {
        backgroundColor: '#FFFFFF',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    cell: {
        padding: 12,
        minWidth: 100,
    },
    cellText: {
        color: '#374151',
    },
}); 