import { KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { SearchBar } from '@/components/ui/search-bar';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { MainHeader } from '@/components/dashboard/main-header';
import { OperatorHeader } from '@/components/operator/operator-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Skeleton, SkeletonBar } from '@/components/ui/content-state';
import tokens from '@/constants/design-tokens.json';
import { operatorTransactionCategories, transactionCategories } from '@/data/transactions';
import { useTransactions } from '@/hooks/use-transactions';
import { useNavigationHeight } from '@/state/navigation-motion';
import type { TransactionCategory, TransactionFilters, TransactionRecord, TransactionSortOrder } from '@/types/transactions';
import { emptyTransactionFilters, filterTransactions, transactionAmount, transactionMetadata } from '@/utils/transactions';
import { TransactionFilterSheet } from './transaction-filter-sheet';

const transactionPageSize = 8;

function TransactionRow({ record }: { record: TransactionRecord }) {
  const { width, fontScale } = useWindowDimensions();
  const amount = transactionAmount(record);
  // Give long amounts and enlarged text their own line without reducing font sizes.
  const stacked = fontScale > 1.25 || (width < 360 && amount.length > 10) || amount.length > 15;
  const title = record.partyName && record.type !== 'sale' && record.type !== 'expense' ? `${record.description} — ${record.partyName}` : record.description;
  const metadata = transactionMetadata(record);
  const partial = record.saleTotalCentavos !== undefined && (record.outstandingCentavos ?? 0) > 0;
  const details = partial ? ` Sale total ${transactionAmount({ amountCentavos: record.saleTotalCentavos!, direction: 'neutral' })}. Received ${amount}. Outstanding ${transactionAmount({ amountCentavos: record.outstandingCentavos!, direction: 'neutral' })}.` : '';
  const amountText = <Text testID="transaction-amount" style={[styles.amount, {
    lineHeight: tokens.typography.listFinancial.lineHeight * fontScale,
    color: record.direction === 'in' ? tokens.color.successBase : record.direction === 'out' ? tokens.color.errorBase : tokens.color.textSecondary,
  }]}>{amount.replace(/ /g, '\u00a0')}</Text>;
  return <View testID="transaction-row" accessible accessibilityLabel={`${title}. ${metadata}. ${amount}.${details}`}
    style={[styles.row, { flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center' }]}>
    <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 2 }}>
      <Text style={[styles.rowTitle, { lineHeight: tokens.typography.labelNav.lineHeight * fontScale }]}>{title}</Text>
      <Text style={[styles.metadata, { lineHeight: tokens.typography.helper.lineHeight * fontScale }]}
        numberOfLines={fontScale > 1.25 ? undefined : 1}>{metadata}</Text>
    </View>
    {stacked ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>{amountText}</ScrollView> : amountText}
  </View>;
}

function TransactionSkeleton() {
  return <Skeleton label="Loading transactions"><View style={{ gap: 12 }}>{Array.from({ length: 7 }, (_, index) =>
    <View key={index} style={styles.row}><View style={{ flex: 1, gap: 6 }}><SkeletonBar width="80%" height={18} /><SkeletonBar width="65%" height={12} /></View><SkeletonBar width={88} height={24} /></View>
  )}</View></Skeleton>;
}

export function TransactionHistoryScreen({ operator = false }: { operator?: boolean }) {
  const { rows, loading, error, retry } = useTransactions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('all');
  const [sortOrder, setSortOrder] = useState<TransactionSortOrder>('newest');
  const [filters, setFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const list = useRef<FlatList<TransactionRecord>>(null);
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const { fontScale } = useWindowDimensions();
  const categories = operator ? operatorTransactionCategories : transactionCategories;
  const filtered = useMemo(() => {
    const result = filterTransactions(rows, query, category, filters);
    return sortOrder === 'newest' ? result : result.sort((a, b) =>
      Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }, [rows, query, category, filters, sortOrder]);
  const hasFilters = !!filters.from || !!filters.to || filters.paymentMethod !== 'all' || category !== 'all' || sortOrder !== 'newest';
  const pageKey = JSON.stringify([query, category, filters, sortOrder, filtered.map(record => record.id)]);
  const [pageState, setPageState] = useState<{ key: string; index: number }>({ key: '', index: 0 });
  const pageCount = Math.max(1, Math.ceil(filtered.length / transactionPageSize));
  const pageIndex = pageState.key === pageKey ? Math.min(pageState.index, pageCount - 1) : 0;
  // TODO(backend): Drive history pagination from the transaction API instead of slicing all local rows.
  // - Method/Action: GET / Fetch transaction page
  // - Expected Input/Payload: pageIndex + 1, transactionPageSize, and active history filters
  // - Expected Response: { items: TransactionRecord[]; total: number }
  // - UI State to Wire: Calculate page count from server total and handle page loading/errors
  const pageRows = filtered.slice(pageIndex * transactionPageSize, (pageIndex + 1) * transactionPageSize);
  const moveToTop = () => list.current?.scrollToOffset({ offset: 0, animated: false });
  const reset = () => { Keyboard.dismiss(); setQuery(''); setCategory('all'); setSortOrder('newest'); setFilters(emptyTransactionFilters()); moveToTop(); };
  const goToPage = (index: number) => {
    setPageState({ key: pageKey, index });
    Keyboard.dismiss();
    moveToTop();
  };
  function back() { Keyboard.dismiss(); if (router.canGoBack()) router.back(); else router.replace(operator ? '/operator-pos' : '/owner-dashboard'); }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
    <View style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
      {operator
        ? <OperatorHeader onNavigate={action => { Keyboard.dismiss(); action(); }} />
        : <MainHeader onNavigate={action => { Keyboard.dismiss(); action(); }} />}
      <KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, minHeight: 0 }}>
          <View style={styles.controls}>
          <View style={styles.heading}>
            <BackButton accessibilityLabel="Go back" onPress={back} />
              <Text accessibilityRole="header" className="type-h1-display text-brand" style={{ lineHeight: tokens.typography.h1Display.lineHeight * fontScale }}>Transaction History</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SearchBar containerStyle={{ flex: 1 }} label="Search transactions" accessibilityHint="Search by transaction number, customer, payee, or description."
              value={query} onChangeText={value => { setQuery(value); moveToTop(); }} placeholder="Search transactions"
              selectionColor={tokens.color.brightBlue} onSubmitEditing={Keyboard.dismiss}
              onClear={() => { setQuery(''); moveToTop(); }} clearLabel="Clear transaction search" />
            <IconButton variant="text" accessibilityLabel={hasFilters ? 'Filter transactions, filters applied' : 'Filter transactions'}
              accessibilityState={{ expanded: filterOpen, selected: hasFilters }} onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }}
              icon={({ color }) => <PosIcon name="filter" size={24} color={color} />} />
          </View>
        </View>
        <FlatList ref={list} data={loading || error ? [] : pageRows} keyExtractor={record => record.id} renderItem={({ item }) => <TransactionRow record={item} />}
          style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 460, alignSelf: 'center' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: navigationHeight + insets.bottom + 24, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? <TransactionSkeleton /> : <View style={styles.empty}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>{error ? 'Unable to load transactions' : rows.length ? 'No matching transactions' : 'No transactions yet'}</Text>
            <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={styles.emptyCopy}>
              {error || (rows.length ? 'Try another search, type, date range, or payment method.' : operator
                ? 'Recorded sales and customer receivables will appear here.'
                : 'Recorded sales, customer payments, and expenses will appear here.')}
            </Text>
            {error ? <Button onPress={retry}>Try Again</Button> : (rows.length > 0 || query || hasFilters) ? <Button variant="secondary" onPress={reset}>Clear search and filters</Button> : null}
          </View>}
          ListFooterComponent={!loading && !error && filtered.length > transactionPageSize ? <View style={styles.pagination}>
            <PaginationControls pageIndex={pageIndex} pageCount={pageCount} itemName="transaction" onPageChange={goToPage} />
          </View> : undefined} />
        </View>
      </KeyboardAvoidingView>
      <DashboardNavigation onHome={() => router.navigate(operator ? '/operator-pos' : '/owner-dashboard')}
        onPos={() => router.navigate(operator ? '/operator-pos' : '/owner-pos')} onUnavailable={() => {}} />
    </View>
    {filterOpen && <TransactionFilterSheet applied={filters} appliedCategory={category} appliedSort={sortOrder}
      categories={categories} onClose={() => setFilterOpen(false)} onApply={(value, nextCategory, nextSort) => {
        setFilters(value); setCategory(nextCategory); setSortOrder(nextSort); moveToTop();
      }} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  controls: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 24, paddingTop: tokens.spacing.headerTitleGap, gap: 8, backgroundColor: tokens.color.appBackground },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  row: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard },
  rowTitle: { fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight, color: tokens.color.textPrimary },
  metadata: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize, lineHeight: tokens.typography.helper.lineHeight, color: tokens.color.textPlaceholder },
  amount: { flexShrink: 0, fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.listFinancial.fontSize, lineHeight: tokens.typography.listFinancial.lineHeight },
  empty: { padding: 20, marginTop: 20, gap: 16, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard },
  emptyTitle: { fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.titleAccent.fontSize, lineHeight: 33, color: tokens.color.textPrimary },
  emptyCopy: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microFinancialRate.fontSize, lineHeight: 21, color: tokens.color.textSecondary },
  pagination: { width: '100%', paddingTop: 4, paddingBottom: 8 },
});
