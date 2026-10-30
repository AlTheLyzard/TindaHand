**CASE ANALYSIS REPORT**

**Project Name:** TindaHand: An Android Application for POS, Inventory Management, and Financial Statement Generation System for Sari-Sari Store Owners  
**TYPE OF REQUEST:**	  \[   \]   System Enhancement 	\[ / \]    New System

**ORGANIZATION OVERVIEW:**  
	Sari-sari stores are small retail businesses that provide everyday goods and essential products to customers within their communities. Store owners manage daily sales, track inventory and stock, record business transactions, handle receivables and payables, and monitor the overall financial standing of their business.  

	In many sari-sari stores, the owner handles multiple responsibilities, as sari-sari stores typically only have one person who handles all activities; commonly, it's the owner themselves. From the physical labor of opening and closing the store, recording daily transactions, grocery shopping, inventory, and organizing stocks, to the mental labor of pricing the products, calculating the sales, credits, and other expenses, store owners are the only ones who manage all those tasks. A cashier or *kahera* may be a family member or a helper; if the store is doing well, they may also assist in processing customer purchases and recording daily sales transactions. Because of the number of transactions and products handled by the business, proper and organized recording and monitoring of sales, inventory, and financial information are essential for efficient store operations.

	The proposed application, **TindaHand,** is an Android application designed to integrate Point-of-Sale (POS), inventory management, guided accounting information, and financial statement generation into one system. The application is intended to support Daddy Store owners in managing daily business operations while providing the Kahera with tools for processing sales, managing customer credit transactions, and accessing product inventory information. 

	The system supports the generation and organization of accounting and financial information, including the General Journal, General Ledger, Income Statement, and Balance Sheet. 

**Existing Process:**

* **Sales and Transaction Recording**

	In a typical sari-sari store, sales transactions may be recorded manually or monitored through basic records maintained by the store owner or cashier. Individual purchases, payments, and daily sales may require manual recording and computation.  
	This process may make it difficult to maintain organized transaction records, particularly when the store handles numerous transactions. Reviewing previous transactions may also require manually checking each recorded item.  
	The store owner may experience difficulty monitoring all business transactions, including those processed by the Kahera, when transaction records are not centralized.

* **Inventory and Asset Monitoring**

	Inventory monitoring may require the store owner to physically check available products and manually determine their remaining quantities. Product information and stock levels may not always be updated immediately after sales or other inventory-related activities.  
	Identifying low stock or out-of-stock products may therefore require repeated manual checking. This process can be time-consuming and may make it difficult for the May-Ari to maintain updated inventory information.  
	The monitoring of business assets may also require separate records, making it more difficult to organize and review asset-related information together with other business records.   
	

* **Customer Credit or Utang Monitoring**

Some sari-sari stores allow customers to purchase products on credit or utang. Monitoring customer credit may require the store owner or Kahera to manually record the amount owed by each customer and track subsequent payments.  
Without a centralized record, reviewing outstanding balances, customer credit history, and payment history may require checking individual records. Updating customer balances after additional credit transactions or payments may also become more difficult.

* **Accounts Payable Monitoring**

	Sari-Sari store owners may have financial obligations to suppliers, creditors, or other parties. These obligations may need to be recorded and monitored to determine outstanding amounts and payment status.  
	When payable records are maintained separately or manually, the May-Ari may experience difficulty monitoring outstanding obligations, settled balances, and payment history.

* **Accounting and Financial Record Management**

	Business activities such as sales, expenses, receivables, payables, assets, and other transactions contain information necessary for accounting and financial monitoring. When these activities are recorded separately, organizing the information required for accounting may become challenging.  
	The  May-Ari may also need a clearer and more guided process for recording and classifying business transactions into appropriate accounts. Without an organized system, reviewing accounting information can become time-consuming and difficult.

* **Financial Performance Monitoring**

	Monitoring the overall financial condition of the business may require the store owner to manually review sales, expenses, inventory, receivables, and payables and other business information. Preparing daily, weekly, or monthly summaries may require additional time and manual computation. As a result, obtaining a clear overview of sales, expenses, profit or loss, inventory, and outstanding balances may be difficult. and other business information.

* **Financial Statement Preparation**

Preparing accounting records and financial statements requires organizing business transactions and relevant financial information. When the process is performed, manually reviewing records and preparing reports can be time-consuming.  
The May-Ari may experience difficulty in organizing information needed for the general journal, general Ledger, income statement, and balance sheet, particularly when business records are not centralized or when accounting procedures are handled manually.

* **User and Access Management**

	When the sari-sari store owner delegates sales activities to Kahera, there is a need to distinguish the functions and information accessible to each user.   
Without role-based access, sensitive business and financial information may not be properly restricted. The May-Ari also needs the ability to manage cashier accounts and control access to functions that should only be available to the store owner.  
	  
**PROBLEM STATEMENT:**

1. How can an Android-based system assist sari-sari store owners and cashiers in efficiently processing and recording sales transactions?  
2. How can a system assist store owners in managing products, inventory, and business assets?  
3. How can a system assist in monitoring customer credit or utang and customer payment records?  
4. How can a system assist sari-sari store owners in monitoring Accounts Receivable and Accounts Payable?  
5. How can a system assist sari-sari store owners in organizing and managing accounting information?  
6. How can a system provide sari-sari store owners with a clearer overview of their financial performance?  
7. How can a system simplify the generation of accounting records and financial statements?  
8. How can a system allow sari-sari store owners to monitor and review recorded business transactions efficiently?  
9. How can a system ensure that sensitive business and financial information is accessible only to authorized users?  
   

**ORGANIZATION NEEDS:**

1. **Centralized Management of Business Transactions**  
   The organization needs a centralized system where sales, payments, customer debts, store debts, expenses, and other business transactions can be recorded and monitored in one place. This will reduce the need to rely on handwritten records, calculators, or memory when managing daily store operations.   
     
2. **Efficient Sales and Payment Recording**  
   The organization needs a faster and more organized way of recording customer purchases. The system should allow the store to browse products, manage the cart, calculate the total amount, and record different payment methods such as cash, GCash, and split payments. This can help minimize errors when processing transactions and make the selling process more efficient.   
     
3. **Accurate Inventory Monitoring**  
   The organization needs to track available products and stock levels. It should identify low, critical, and out-of-stock products, and monitor restocking and products nearing expiration. This will help the store owner know which products need to be replenished and prevent problems caused by inaccurate stock records.   
     
4. **Proper Management of Business Assets**  
   The organization needs a way to record and monitor its business assets, including their values and classifications. Keeping these records organized can help the store owner have a clearer view of the resources owned by the business and their contribution to the overall financial position.   
5. **Monitoring of Customer Debts and Store Credit**  
   The organization needs to properly monitor both money owed by customers and debts owed by the store. The system should record debt amounts, due dates, payments, remaining balances, and payment status. This will help the store owner keep track of outstanding obligations and avoid forgetting unpaid or overdue transactions. 

6. **Organized Expense Recording and Monitoring**  
   The organization needs an organized method for recording business expenses. Expenses should be recorded with their description, amount, category, and date so that the store owner can review where business money is being spent. This can also help in determining the actual profit of the business instead of looking only at total sales.   
     
7. **Reliable Financial Information**  
   The organization needs accurate financial information that can be generated from its recorded transactions. Instead of manually organizing transactions into accounting records, the system should provide the General Journal, General Ledger, Income Statement, and Balance Sheet. This will give the store owner a clearer view of the business's income, expenses, assets, liabilities, and owner's equity.   
     
8. **Secure and Controlled User Access**  
   The organization needs to control who can access specific system functions. Since TindaHand has different users such as May-Ari and Kahera, the system should provide appropriate roles, permissions, and access restrictions. This helps protect sensitive business information and ensures that users can only perform functions assigned to their role.   
     
9. **Monitoring and Accountability of User Activities**  
   The organization needs to keep track of important activities performed within the system. Recording actions such as adding, editing, deleting, and updating records can help the store owner review user activities and identify changes made to business records.   
     
10. **Accessible Business Information for Decision-Making**  
    The organization needs an accessible way to view important business information and monitor its current operations. By combining POS, inventory management, and financial information in one Android application, the store owner can have a more complete view of the business and use the information when making decisions about products, expenses, debts, and finances. 

**SYSTEM FEATURES:**

1. **May-Ari Module**

**Primary User:** Store Owner / May-Ari

The May-Ari Module provides the store owner with the main functions for managing store operations, sales, inventory, finances, and user access.

**Login / Account Access**

* Provides secure access to the application and manages the May-Ari account and the creation of authorized Kahera accounts.

**Dashboard**

* Provides an overview of the store’s financial status, sales performance, and best-selling products to support daily monitoring and decision-making.

**Inventory and Asset Management**

* Manages the store’s products, inventory levels, stock conditions, expiration information, and recorded business assets.

**Point-of-Sale (POS)**

* Handles product browsing and selection, cart management, checkout, and customer payment processing for store sales.

**Accounts Receivable and Accounts Payable**

* Manages customer debts and store debts, including debt records, payment status, balances, and payment history.

**Quick Add / Shortcut Transaction Recording**

* Provides quick access to frequently used functions for recording sales, products, assets, debts, and store expenses.

**More Tools**

* Provides access to financial statements and supporting tools for reviewing transactions, managing expenses, and identifying products.

**Profile**

* Allows the May-Ari to manage personal account information and control Kahera accounts and access permissions.

**Settings**

* Allows the user to manage available application preferences and notification settings.

2. **Kahera Module**

**Primary Use:** Store Operator / Kahera

The Kahera Module provides the cashier with authorized functions to process sales, monitor inventory, manage customer debts, and review store transactions.

**Login / Account Access**

* Provides the Kahera with secure access using the assigned May-Ari ID and Kahera credentials, while validating authorized access to the system.

**Inventory Management**

* Allows the Kahera to view and update authorized product and inventory information, monitor stock conditions, manage restocking records, and check product expiration.

**Point-of-Sale (POS)**

* Handles product browsing and selection, cart management, checkout, and customer payment processing for store transactions.

**Accounts Receivable / Customer Debt**

* Allows the Kahera to record customer debts, monitor their payment status, update payments, and review paid debt records.

**More Tools**

* Provides access to transaction history for reviewing recorded transactions and barcode scanning for identifying and searching products.

**Profile**

* Allows the Kahera to view and manage personal account information.

**Settings**

* Allows the Kahera to manage available application preferences and notification settings.

**Prepared by:**

Agustin, Erica Monique S.			Ibay, Charles Allen T. 		Pedrera, Francesca Denise B.		  
				  
Sibonga, Jeanice Kyle A.    		Solibio, Alyannah Lyz Y.