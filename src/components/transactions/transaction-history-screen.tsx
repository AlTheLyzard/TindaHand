import { KeyboardInput as TextInput, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { MainHeader } from '@/components/dashboard/main-header';
import { OperatorHeader } from '@/components/operator/operator-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { PosChip } from '@/components/pos/pos-chip';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Skeleton, SkeletonBar } from '@/components/ui/content-state';
import tokens from '@/constants/design-tokens.json';
import { operatorTransactionCategories, transactionCategories } from '@/data/transactions';
import { useTransactions } from '@/hooks/use-transactions';
import { useNavigationHeight } from '@/state/navigation-motion';
import type { TransactionCategory, TransactionFilters, TransactionRecord } from '@/types/transactions';
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

export function TransactionHistoryScreen({ operator = false }: { operator?: boolean }) {
  const { rows, loading, error, retry } = useTransactions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('all');
  const [filters, setFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const list = useRef<FlatList<TransactionRecord>>(null);
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const { width, fontScale } = useWindowDimensions();
  const categories = operator ? operatorTransactionCategories : transactionCategories;
  const filtered = useMemo(() => filterTransactions(rows, query, category, filters), [rows, query, category, filters]);
  const hasFilters = !!filters.from || !!filters.to || filters.paymentMethod !== 'all';
  const pageKey = JSON.stringify([query, category, filters, filtered.map(record => record.id)]);
  const [pageState, setPageState] = useState<{ key: string; index: number }>({ key: '', index: 0 });
  const pageCount = Math.max(1, Math.ceil(filtered.length / transactionPageSize));
  const pageIndex = pageState.key === pageKey ? Math.min(pageState.index, pageCount - 1) : 0;
  // TODO(backend): Drive history pagination from the transaction API instead of slicing all local rows.
  // - Method/Action: GET / Fetch transaction page
  // - Expected Input/Payload: pageIndex + 1, transactionPageSize, and active history filters
  // - Expected Response: { items: TransactionRecord[]; total: number }
  // - UI State to Wire: Calculate page count from server total and handle page loading/errors
  const pageRows = filtered.slice(pageIndex * transactionPageSize, (pageIndex + 1) * transactionPageSize);
  const safeWidth = Math.max(1, width - insets.left - insets.right);
  const titleWidth = Math.max(1, Math.min(safeWidth, 460) - 48 - tokens.size.touchTarget - 4);
  const titleFontSize = Math.min(32, Math.max(8, titleWidth * 0.095));
  const searchHeight = Math.max(tokens.size.touchTarget, Math.ceil(fontScale * 18) + 24);
  const moveToTop = () => list.current?.scrollToOffset({ offset: 0, animated: false });
  const reset = () => { Keyboard.dismiss(); setQuery(''); setCategory('all'); setFilters(emptyTransactionFilters()); moveToTop(); };
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
            <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="clip" adjustsFontSizeToFit minimumFontScale={0.3}
              style={[styles.title, { fontSize: titleFontSize, lineHeight: titleFontSize * 1.375 }]}>Transaction History</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.search, { minHeight: searchHeight + 2, borderColor: focused ? tokens.color.accentBase : tokens.color.borderOutline }]}>
              <PosIcon name="search" size={20} color="#5A7394" />
              <TextInput accessibilityLabel="Search transactions" accessibilityHint="Search by transaction number, customer, payee, or description."
                value={query} onChangeText={value => { setQuery(value); moveToTop(); }} placeholder="Search transactions..." placeholderTextColor={tokens.color.textSecondary}
                underlineColorAndroid="transparent" selectionColor={tokens.color.accentBase} autoCorrect={false} spellCheck={false} autoCapitalize="none"
                returnKeyType="search" onSubmitEditing={Keyboard.dismiss} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                style={[styles.searchInput, { height: searchHeight }]} />
              {!!query && <IconButton accessibilityLabel="Clear transaction search" onPress={() => { setQuery(''); moveToTop(); }}
                icon={({ color }) => <PosIcon name="close" size={18} color={color} />} />}
            </View>
            <Button compact variant="text" fullWidth={false} accessibilityLabel={hasFilters ? 'Filter transactions, filters applied' : 'Filter transactions'}
              accessibilityState={{ expanded: filterOpen, selected: hasFilters }} onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }}
              iconPosition="trailing" icon={props => <PosIcon name="filter" {...props} />}>Filter</Button>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginRight: -24 }} contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
            {categories.map(item => <PosChip key={item.value} appearance="category" label={item.label} selected={category === item.value}
              onPress={() => { setCategory(item.value); moveToTop(); }} />)}
          </ScrollView>
        </View>
        <FlatList ref={list} data={loading || error ? [] : pageRows} keyExtractor={record => record.id} renderItem={({ item }) => <TransactionRow record={item} />}
          style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 460, alignSelf: 'center' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: navigationHeight + insets.bottom + 24, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? <TransactionSkeleton /> : <View style={styles.empty}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>{error ? 'Unable to load transactions' : rows.length ? 'No matching transactions' : 'No transactions yet'}</Text>
            <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={styles.emptyCopy}>
              {error || (rows.length ? 'Try another search, category, date range, or payment method.' : operator
                ? 'Recorded sales and customer receivables will appear here.'
                : 'Recorded sales, customer payments, and expenses will appear here.')}
            </Text>
            {error ? <Button onPress={retry}>Try Again</Button> : (rows.length > 0 || query || category !== 'all' || hasFilters) ? <Button variant="secondary" onPress={reset}>Clear search and filters</Button> : null}
          </View>}
          ListFooterComponent={!loading && !error && filtered.length > transactionPageSize ? <View style={styles.pagination}>
            <PaginationControls pageIndex={pageIndex} pageCount={pageCount} itemName="transaction" onPageChange={goToPage} />
          </View> : undefined} />
        </View>
      </KeyboardAvoidingView>
      <DashboardNavigation onHome={() => router.navigate(operator ? '/operator-pos' : '/owner-dashboard')}
        onPos={() => router.navigate(operator ? '/operator-pos' : '/owner-pos')} onUnavailable={() => {}} />
    </View>
    {filterOpen && <TransactionFilterSheet applied={filters} onClose={() => setFilterOpen(false)} onApply={value => { setFilters(value); moveToTop(); }} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  controls: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 8, backgroundColor: tokens.color.appBackground },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  title: { flex: 1, minWidth: 0, fontFamily: 'Poppins_700Bold', color: '#112F6F' },
  search: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: tokens.radius.control, backgroundColor: tokens.color.surfaceCard, boxShadow: 'inset 0 2px 3px #D9E7F4' },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, textAlignVertical: 'center', fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: tokens.color.textPrimary },
  row: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 18, color: tokens.color.textPrimary },
  metadata: { fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 15, color: '#5A7394' },
  amount: { flexShrink: 0, fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 24 },
  empty: { padding: 20, marginTop: 20, gap: 16, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 33, color: tokens.color.textPrimary },
  emptyCopy: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21, color: tokens.color.textSecondary },
  pagination: { width: '100%', paddingTop: 4, paddingBottom: 8 },
});
