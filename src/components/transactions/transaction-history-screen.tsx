import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { PosChip } from '@/components/pos/pos-chip';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { Skeleton, SkeletonBar } from '@/components/ui/content-state';
import tokens from '@/constants/design-tokens.json';
import { transactionCategories } from '@/data/transactions';
import { useTransactions } from '@/hooks/use-transactions';
import { useNavigationHeight } from '@/state/navigation-motion';
import type { TransactionCategory, TransactionFilters, TransactionRecord } from '@/types/transactions';
import { emptyTransactionFilters, filterTransactions, transactionAmount, transactionMetadata } from '@/utils/transactions';
import { TransactionFilterSheet } from './transaction-filter-sheet';

function TransactionRow({ record }: { record: TransactionRecord }) {
  const { width, fontScale } = useWindowDimensions();
  const amount = transactionAmount(record);
  // Give long amounts and enlarged text their own line without reducing font sizes.
  const stacked = fontScale > 1.25 || (width < 360 && amount.length > 10) || amount.length > 15;
  const title = record.partyName && record.type === 'customerPayment' ? `${record.description} — ${record.partyName}` : record.description;
  const metadata = transactionMetadata(record);
  const partial = record.saleTotalCentavos !== undefined && (record.outstandingCentavos ?? 0) > 0;
  const details = partial ? ` Sale total ${transactionAmount({ amountCentavos: record.saleTotalCentavos!, direction: 'neutral' })}. Received ${amount}. Outstanding ${transactionAmount({ amountCentavos: record.outstandingCentavos!, direction: 'neutral' })}.` : '';
  const amountText = <Text testID="transaction-amount" style={[styles.amount, { color: record.direction === 'in' ? '#1D5D21' : record.direction === 'out' ? '#972020' : tokens.color.textSecondary }]}>{amount.replace(/ /g, '\u00a0')}</Text>;
  return <View testID="transaction-row" accessible accessibilityLabel={`${title}. ${metadata}. ${amount}.${details}`}
    style={[styles.row, { flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center' }]}>
    <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 2 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.metadata} numberOfLines={fontScale > 1.25 ? undefined : 1}>{metadata}</Text>
    </View>
    {stacked ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>{amountText}</ScrollView> : amountText}
  </View>;
}

function TransactionSkeleton() {
  return <Skeleton label="Loading transactions"><View style={{ gap: 12 }}>{Array.from({ length: 7 }, (_, index) =>
    <View key={index} style={styles.row}><View style={{ flex: 1, gap: 6 }}><SkeletonBar width="80%" height={18} /><SkeletonBar width="65%" height={12} /></View><SkeletonBar width={88} height={24} /></View>
  )}</View></Skeleton>;
}

export function TransactionHistoryScreen() {
  const { rows, loading, error, retry } = useTransactions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('all');
  const [filters, setFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const list = useRef<FlatList<TransactionRecord>>(null);
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const filtered = useMemo(() => filterTransactions(rows, query, category, filters), [rows, query, category, filters]);
  const hasFilters = !!filters.from || !!filters.to || filters.paymentMethod !== 'all';
  const moveToTop = () => list.current?.scrollToOffset({ offset: 0, animated: false });
  const reset = () => { Keyboard.dismiss(); setQuery(''); setCategory('all'); setFilters(emptyTransactionFilters()); moveToTop(); };
  function back() { Keyboard.dismiss(); if (router.canGoBack()) router.back(); else router.replace('/owner-dashboard'); }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#E8F1FB' }}>
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Image source={require('@/assets/images/financial/transaction-background.svg')} contentFit="fill" accessible={false}
        pointerEvents="none" style={{ position: 'absolute', bottom: navigationHeight + insets.bottom, width: '100%', height: 210 }} />
      <KeyboardAvoidingView style={{ flex: 1, paddingBottom: navigationHeight + insets.bottom }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.controls}>
          <View style={styles.heading}>
            <IconButton accessibilityLabel="Go back" onPress={back} style={{ marginLeft: -12 }} icon={({ color }) => <PosIcon name="back" color={color} size={24} />} />
            <Text accessibilityRole="header" style={styles.title}>Transaction History</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.search, { borderColor: focused ? tokens.color.accentBase : '#E6EEF8' }]}>
              <PosIcon name="search" size={20} color="#5A7394" />
              <TextInput accessibilityLabel="Search transactions" accessibilityHint="Search by transaction number, customer, payee, or description."
                value={query} onChangeText={value => { setQuery(value); moveToTop(); }} placeholder="Search transactions..." placeholderTextColor="#5A7394"
                autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.searchInput} />
            </View>
            <IconButton accessibilityLabel={hasFilters ? 'Filter transactions, filters applied' : 'Filter transactions'}
              accessibilityState={{ expanded: filterOpen, selected: hasFilters }} onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }}
              icon={() => <PosIcon name="filter" size={24} color={hasFilters ? tokens.button.primary.default : '#000000'} />} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginRight: -24 }} contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
            {transactionCategories.map(item => <PosChip key={item.value} appearance="category" label={item.label} selected={category === item.value}
              onPress={() => { setCategory(item.value); moveToTop(); }} />)}
          </ScrollView>
        </View>
        <FlatList ref={list} data={loading || error ? [] : filtered} keyExtractor={record => record.id} renderItem={({ item }) => <TransactionRow record={item} />}
          style={{ flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? <TransactionSkeleton /> : <View style={styles.empty}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>{error ? 'Unable to load transactions' : rows.length ? 'No matching transactions' : 'No transactions yet'}</Text>
            <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={styles.emptyCopy}>
              {error || (rows.length ? 'Try another search, category, date range, or payment method.' : 'Recorded sales, customer payments, and expenses will appear here.')}
            </Text>
            {error ? <Button onPress={retry}>Try Again</Button> : (rows.length > 0 || query || category !== 'all' || hasFilters) ? <Button variant="secondary" onPress={reset}>Clear search and filters</Button> : null}
          </View>} />
      </KeyboardAvoidingView>
      <DashboardNavigation onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')} onUnavailable={() => {}} />
    </View>
    {filterOpen && <TransactionFilterSheet applied={filters} onClose={() => setFilterOpen(false)} onApply={value => { setFilters(value); moveToTop(); }} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  controls: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 8, backgroundColor: '#FFFFFF' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  title: { flex: 1, minWidth: 0, fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 44, color: '#112F6F' },
  search: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: tokens.radius.control, backgroundColor: '#FFFFFF', boxShadow: 'inset 0 2px 4px rgba(115,153,204,0.25), 0 1px 3px #D9E7F4' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: tokens.color.textPrimary },
  row: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: tokens.radius.card, backgroundColor: '#FFFFFF' },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 18, color: tokens.color.textPrimary },
  metadata: { fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 15, color: '#5A7394' },
  amount: { flexShrink: 0, fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 24 },
  empty: { padding: 20, marginTop: 20, gap: 16, borderRadius: tokens.radius.card, backgroundColor: '#FFFFFF' },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 33, color: tokens.color.textPrimary },
  emptyCopy: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21, color: tokens.color.textSecondary },
});
