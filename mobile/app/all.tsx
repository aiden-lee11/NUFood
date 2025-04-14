import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { Table } from '../components/Table';
import { useDataStore } from '../store';
import { Item } from '../types/ItemTypes';

export default function AllItemsPage() {
    const { allItems } = useDataStore();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = allItems.filter((item: Item) =>
        item.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        { key: 'Name', title: 'Name' },
        { key: 'Location', title: 'Location' },
        { key: 'startTime', title: 'Start Time' },
        { key: 'endTime', title: 'End Time' },
        { key: 'day', title: 'Day' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search items..."
                />
            </View>
            <ScrollView style={styles.tableContainer}>
                <Table data={filteredItems} columns={columns} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tableContainer: {
        flex: 1,
        padding: 16,
    },
}); 