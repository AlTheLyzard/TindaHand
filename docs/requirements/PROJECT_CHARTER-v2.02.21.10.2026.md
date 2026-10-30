  
**PROJECT CHARTER**

| Group Number: 4 | Date: September 2026 | Revision Number:  |
| :---- | :---- | :---- |
| **Project Name:** TindaHand:  An Android Application for POS, Inventory Management, and Financial Statement Generation System for Sari-Sari Store Owners |  |  |
| **Group Members:  Agustin, Erica Monique S. Ibay, Charles Allen T. Pedrera, Francesca Denise B. Sibonga, Jeanice Kyle A. Solibio, Alyannah Lyz Y.** |  |  |

1. **Project Summary and Goals**

		  
	Businesses play an essential role in economic activity by facilitating the production, distribution, and provision of goods and services to consumers. Among the different types of businesses, retail enterprises focus on the direct sale of products to consumers for personal or household use; they vary considerably in size and operational structures, ranging from large commercial establishments to Micro, Small, and Medium Enterprises (MSMEs). Within the Philippine context, a common example of a small-scale retail business is the sari-sari store. Derived from the Filipino term “sari-sari,” which means “variety”, the sari-sari store is a neighborhood-based convenience retail establishment that offers a variety of everyday products to consumers. These stores are particularly important within local communities because of their accessibility, convenience, and affordability. Although they operate on a relatively small scale, sari-sari stores involve various operations and financial activities that require proper management; effective management of these activities is important for maintaining organized operations and supporting business sustainability. 

Sari-sari store owners commonly encounter difficulties in monitoring sales, inventory, expenses, customer credit, and other financial transactions. Many small-scale retailers continue to rely on handwritten records, calculators, or memory, which can make transaction management time-consuming and prone to errors. These methods may also make it difficult for owners to obtain a complete view of their actual financial performance because total sales alone do not indicate whether a business is generating profit. Owners must also consider inventory costs, operating expenses, outstanding credits, and other financial transactions when determining their actual profit or loss. Managing these different aspects separately can make it challenging to organize business information and evaluate how effectively resources are being utilized. These identified problems led to the idea of TindaHand, an Android-based application designed to organize business transactions and provide owners with a more comprehensive view of their operations.

TindaHand is an Android application collaboratively designed and developed by third-year students from the College of Computing and Information Sciences (CCIS) and the Institute of Accountancy and Finance (IAF). It addresses the need for a more accessible, integrated approach to managing the daily operations and financial activities of local sari-sari stores. To achieve this, the application combines a Point-of-Sale (POS) system, inventory management, and automated financial statement generation into one centralized digital platform. It generates accounting information such as the General Journal, General Ledger, Balance Sheet, and Income Statement based on recorded business transactions. Through these features, the system aims to help store owners monitor their sales, inventory, expenses, and other financial activities while gaining a clearer understanding of their profitability and financial position. As a business management and accounting application, TindaHand is intended to serve as a practical digital business assistant for small-scale retailers.

The development of TindaHand presents an opportunity to provide sari-sari store owners with an accessible and integrated solution for managing their operations and assessing their financial performance. By combining POS, inventory management, and financial statement generation in one Android application, the system offers practical value to small-scale retailers. Although initially developed as an academic project, TindaHand has potential for further development and commercialization. Focusing specifically on local sari-sari stores allows TindaHand to address the needs of micro, small, and medium enterprises (MSMEs) that typically lack capital for complex management software. Ultimately, equipping these neighborhood retailers with a digital tool can improve their financial literacy in the long run. By empowering these grassroots enterprises to thrive in a digital landscape, this project will positively contribute to broader local economic growth.

2. **Project Scope (System Features)**

The scope of the project includes the design, development, and testing of the project components. The following components are: 	

**System Components**

1. **May-Ari Module**

**Primary User:** Store Owner / May-Ari

1. **Login / Account Access**  
   Provide secure access to the TindaHand application based on the user's assigned profile and account credentials.   
   **1.1 Profile Selection**  
* Allows the user to select the May-Ari profile to access the store owner’s account.

	**1.2 May-Ari Account Creation**

* Allows a first-time user to create a May-Ari account and receive a May-Ari ID.

	**1.3 Kahera Account Setup**

* Allows the May-Ari to create and save Kahera account/s for store operations.

	**1.4 May-Ari Login**

* Allows the May-Ari to access the account using the assigned May-Ari ID and PIN.

	**1.5 May-Ari Module Access**

* Provides access to the May-Ari dashboard and its authorized system features after successful account creation or login.


2. **Dashboard**  
   Provides the May-Ari with an overview of the store's current financial and sales information.   
   **2.1 Pera sa Kaha / Money Tracker**  
* Displays and monitors the store's available cash and cash movements. 

	**2.2 Sales Report**

* Provides a summary of the store's sales performance. 

	**2.3  Mga Mabentang Items / Best-Selling Items**

* Provides an overview of the store's best-selling products based on recorded sales. 

3. **Inventory and Asset Management / Paninda at Pag-aari**  
   Manages the store's products, inventory levels, and business assets through the dashboard's navigation bar. This component combines the Paninda (Inventory) and Pag-aari (Assets) components.

		**3.1 Inventory Dashboard** 

* Provides an overview of the store's current inventory in stock conditions.

		**3.2 Product Inventory Management**

* Manages product information and inventory records.

		**3.3  Stock Monitoring and Restocking**

* Monitors stock conditions and manages product replenishment. 

		**3.4 Product Search and Expiration Monitoring** 

* Helps locate products and monitor their expiration status.

		**3.5 Asset Overview and Management**

* Provides an overview and manages the store's recorded business assets.

4. **Point-of-Sale (POS)**  
   Provides a sales transaction interface for selecting products, managing the purchased items, and processing customer payments.   
   	**4.1 Product Browsing and Selection**  
* Allows the May-Ari to browse available products and select items for purchase.

		**4.2 Cart Management**

* Manages the products selected for the current purchase and calculates the order total. 

		**4.3 Checkout**

* Allows the May-Ari to review the order and proceed to payment.

		**4.4 Payment Processing**

* Processes customer payments and determines the final payment result. 

5. **Accounts Receivable and Accounts Payable / Customer Debt and Store Debt / Sisingilin at Utang Ko**  
   Manages customer debts and store debts, including debt recording, payment monitoring, balances, due dates, and payment history. This component combines the Sisingilin (Customer Debt) and Utang Ko (Store Debt) components. 

		**5.1 Accounts Receivable / Customer Debt / Sisingilin**

* Manages customer debts owed to the store, from recording credit transactions to monitoring payments and remaining balances. 

		**5.2 Accounts Payable / Store Debt / Utang Ko**

* Manages debts owed by the store to creditors or suppliers, including recording, payment tracking, and debt history.

	

6. **Quick Add / Shortcut Transaction Recording**  
   Provides quick access to commonly used stored transactions and records them directly through the dashboard.  
   	**6.1 Sales and Product Recording**  
* Provide shortcuts for recording new sales and adding products to the store's inventory.   
* New Sale, Add Paninda

		**6.2 Asset and Debt Recording**

* Provide shortcuts for recording business assets, customer debts, and store debts.   
* Add Pag-aari, Record Sisingilin, and Record Utang Ko

		**6.3 Expense Recording**

* Provides a shortcut for recording store expenses. 

7. **More Tools**  
   Provides access to financial statements and other supporting tools for managing and reviewing store information. 

		**7.1 Financial Statements**

* Generates the store's financial statements based on recorded business transactions.  
* Generates General Journal, Generates General Ledger, Generates Income Statement, Generates Balance Sheet, and Downloads financial statement/s  
  **7.2 Other Tools**  
* Provides supporting tools for transaction management, expense monitoring, and product identification. 

			**7.2.1 Transaction History**

* Allows the May-Ari to review and manage previously reported transactions. 

  **7.2.2  Store Expenses / Gastusin** 

* Allows the May-Ari to record, categorize, and monitor business expenses.

  **7.2.3 Barcode Scanner**

* Allows the user to scan product barcodes to copy, identify, and search for products in the inventory.

8. **Profile**  
   Allows users to view and manage their account information and, for the May-Ari, control Kahera access and permissions.  
   	**8.1 User Profile**  
* Allows users to view and manage their personal account information. 

		**8.2 Access Control**

* Allows the May-Ari to manage Kahera access and permissions within the system. 


9. **Settings**  
   Allows users to view and manage their account information and, for the May-Ari, control Kahera access and permissions.  
   	**9.1 Application Settings**  
* Allows users to customize available application preferences and notifications.  
    
    
2. **Kahera Module**

**Primary User:** Store Operator / Kahera

1. **Login / Account Access**  
   Provides the Kahera with access to the Tendahan application using the assigned Kahera credentials.  
   	**1.1 Profile Selection**  
* Allows the user to select the Kahera profile to access the store's cashier module.  
  **1.2 Kahera Login**  
* Allows Kahera to access the application using the assigned May-Ari andD and Kahera PIN. 

		**1.3 Kahera Credential Validation**

* Validates the entered Kahera credentials before granting access to the application.   
  	**1.4 Kahera Module Access**  
* Provides the authenticated Kahera with access to the Kahera dashboard and its authorized functions. 

2. **Point-of-Sale (POS)**  
   Allows the Kahera to process customer purchases by selecting products, managing the cart, reviewing orders, and processing payments. 

		**2.1 Product Browsing and Selection**

* Allows the Kahera to browse and select available products for customer purchases. 

		**2.2 Cart Management**

* Allows the Kahera to manage selected products and quantities before checkout and calculate the total amount.

		**2.3 Checkout**

* Allows the Kahera to review the customer's order and proceed with payment.

		**2.4 Payment Processing**

* Allows the Kahera to record customer payments and complete the transaction.  
    
3. **Inventory Management / Paninda**  
   Manages and monitors the store's product inventory, stock levels, restocking, and product expiration information.

		**3.1 Inventory Dashboard**

* Provides an overview of the store's current inventory and stock conditions. 

		**3.2 Product Inventory Management**

* Allows the Kahera to view and edit existing product information and inventory details. 

		**3.3 Stock Monitoring**

* Monitors current inventory levels and identifies products based on their stock conditions. 

		**3.4 Restocking Management**

* Allows the Kahera to record and update inventory when products are replenished. 

		**3.5 Product Search and Filtering**

* Allows the Kahera to quickly locate and organize product records. 

		**3.6 Expiration and Product Monitoring**

* Monitors product expiration dates and identifies products that are nearing or past expiration. 

		

4. **Accounts Receivable / Customer Debt / Sisingilin**  
   Allows the Kahera to record, monitor, and manage customer debts, including their payment status and payment history. This component has the Sisingilin (Customer Debt).  
   	**4.1 Customer Debt Overview**  
* Provides an overview of the amounts owed by customers and their current debt status

		**4.2 Customer Debt Recording**

* Allows the Kahera to record customer purchases made on credit. 

		**4.3 Customer Debt Payment Management**

* Allows the Kahera to monitor customer debts and update their status after payments. 

		**4.4 Paid Customer Debt History**

* Allows the Kahera to view records of previously paid customer debts. 

5. **More Tools**  
   Provides access to supporting tools that help the Kahera review recorded transactions and identify products through barcode scanning.  
   	**5.1 Other Tools**

   **5.1.1 Transaction History**  
* Allows the Kahera to view and review recorded transaction history. 

			**5.1.2 Barcode Scanner**

* Allows the Kahera to scan product barcodes to quickly identify and search for products. 

6. **Profile**  
   Allows the Kahera to view and manage their personal account information.   
   	**6.1 User Profile**  
* Allows the Kahera to view and manage their personal account information. 

7. **Settings**  
   Allows the Kahera to manage available application preferences and notification settings.   
   	**7.1 Application Settings**  
* Allows the Kahera to customize available application preferences and notifications. 


**Key Distinctions between the May-Ari and Kahera Modules**

| System Component | May-Ari Module | Kahera Module |
| :---- | :---- | :---- |
| **Primary User** | **Store Owner / May-Ari** | **Store Operator / Kahera** |
| **Login / Account Access** | Creates and manages the May-Ari account, creates Kahera accounts, and accesses the May-Ari module using the May-Ari ID and PIN. | Logs in using the assigned May-Ari ID and Kahera PIN and accesses authorized Kahera functions. |
| **Dashboard** | Includes Pera sa Kaha / Money Tracker, Sales Report, and Mga Mabentang Items / Best-Selling Items. As well as  | Not included. |
| **Inventory and Asset Management / Paninda at Pag-aari** | Can manage product inventory and manage business assets, including adding and managing asset records. | Can monitor and update authorized inventory information. Asset Management not included. |
| **Product Management** | Can add, edit, and remove product records. | Can view and edit existing product information (product quantity), with product creation and removal restricted to the May-Ari.  |
| **Point-of-Sale (POS)** | Full POS functions for product selection, cart management, checkout, and payment processing. | Same POS functions as the May-Ari, including product selection, cart management, checkout, and payment processing. |
| **Accounts Receivable / Customer Debt / Sisingilin** | Can record, monitor, manage, and review customer debts and payments. | Can record, monitor, manage, and review customer debts only. |
| **Accounts Payable / Store Debt / Utang Ko** | Can manage Store Debt / Utang Ko, including recording, payment tracking, and debt history. | Not included. |
| **Quick Add / Shortcut Transaction Recording** | Includes New Sale, Add Paninda, Add Pag-aari, Recording Sisingilin, Record Utang Ko, and Add Gastusin. | Not included. |
| **Financial Statements** | Can generate and download the General Journal, General Ledger, Income Statement, and Balance Sheet. | Not included. |
| **Gastusin / Expenses** | Can record, categorize, monitor, and manage store expenses. | Not included. |
| **Transaction History** | Can view, search, filter, edit, update, delete, and manage transaction records. | View, search, and filter only. Cannot edit, update, or delete records. |
| **Barcode Scanner** | Available for product identification and inventory search. | Available for product identification and inventory search. |
| **Profile** | User Profile \+ Access Control for managing Kahera access, roles, and permissions. | User Profile only. Access Control is not available. |
| **Settings** | Can manage available application preferences and notifications. | Can manage available application preferences and notifications. |
| **Overall Access** | Overall access covering administrative, financial, and store-management functions. | Operational access focused on daily store and cashier-related activities. |

**Tools to be used:** 

1. **Documentation and Project Management**   
   1. Google Docs  
   2. Google Sheets  
   3. Google Drive  
   4. Google Calendar  
2. **Design Tools**   
   1. Figma  
   2. Canva  
3. **Development Tools**   
   1. Programming Language & Frameworks  
      1. React Native  
   2. Integrated Development Environment/s (IDE)  
      1. Visual Studio Code  
   3. Database  
      1. MySQL  
4.  **Testing Tool**  
   1. Firebase Test Lab  
   2. Mobile Phones

3. **Project Milestones**  
   

Identify the significant project milestones, including invoicing dates to the client.

| Milestone 1 – Requirement Analysis  |  |  |
| :---- | :---- | :---- |
| **Number** | **Deliverables**  | **Target Date** |
| **1** | System Request | September 21, 2026 |
| **2** | Project Charter  | September 21, 2026 |
| **3** | User Journey (Optional) |  |
| **4** | Empathy Map  | September 15, 2026 |
| **5** | User Story | October 05, 2026 |

| Milestone 2  – Design  |  |  |
| ----- | :---- | :---- |
| **Number** | **Deliverables**  | **Target Date** |
| **1** | **Diagrams**  |  |
|  | Software Architecture |  |
|  | Use Case |  |
|  | Activity Diagram |  |
|  | DFD | October 10, 2026 |
|  | ERD and Data Dictionary | October 10, 2026 |
| **2** | **Figma Design** |  |
|  | Design Branding |  |
|  | Mid Fidelity |  |
|  | High Fidelity  |  |
| **MAY-ARI MODULE** |  |  |
| **3** | **Front End**  |  |
| **3.1** | **May-Ari Login / Account Access** |  |
|  | Profile Selection |  |
|  | May-Ari Account Creation |  |
|  | Kahera Account Setup |  |
|  | May-Ari Login |  |
|  | May-Ari Module Access |  |
| **3.2** | **May-Ari Dashboard** |  |
|  | Pera sa Kaha / Money Tracker |  |
|  | Sales Report |  |
|  | Mga Mabentang Items / Best-Selling Items |  |
| **3.3** | **May-Ari Inventory and Asset Management / Paninda at Pag-aari** |  |
|  | Inventory Dashboard |  |
|  | Product Inventory Management |  |
|  | Stock Monitoring |  |
|  | Restocking Management |  |
|  | Product Search and Filtering |  |
|  | Expiration and Product Monitoring |  |
|  | Asset Overview and Management |  |
| **3.4** | **May-Ari POS** |  |
|  | Product Browsing and Selection |  |
|  | Cart Management |  |
|  | Checkout |  |
|  | Payment Processing |  |
| **3.5**  | **May-Ari Accounts Receivable and Payable / Customer Debt and Store Debt / Sisingilin at Utang Ko** |  |
|  | Customer Debt / Sisingilin |  |
|  | Store Debt / Utang Ko |  |
| **3.6** | **May-Ari Quick Add / Shortcut Transaction Recording** |  |
|  | New Sale |  |
|  | Add Paninda |  |
|  | Add Pag-aari |  |
|  | Record Sisingilin |  |
|  | Record Utang Ko |  |
|  | Add Gastusin |  |
| **3.7** | **May-Ari More Tools** |  |
|  | Financial Statements |  |
|  | Transaction History |  |
|  | Store Expenses / Gastusin |  |
|  | Barcode Scanner |  |
| **3.8** | **May-Ari Profile** |  |
|  | User Profile |  |
|  | Access Control |  |
| **3.9** | **May-Ari Settings** |  |
|  | Application Settings |  |
| **KAHERA MODULE** |  |  |
| **3.10** | **Kahera Login / Account Access** |  |
|  | Profile Selection |  |
|  | Kaher Login |  |
|  | Kahera Credential Validation |  |
|  | Kahera Module Access |  |
| **3.11** | **Kahera POS** |  |
|  | Product Browsing and Selection |  |
|  | Cart Management |  |
|  | Checkout |  |
|  | Payment Processing |  |
| **3.12** | **Kahera Inventory Management** |  |
|  | Inventory Dashboard |  |
|  | Product Inventory Management |  |
|  | Stock Monitoring |  |
|  | Restocking Management |  |
|  | Product Search and Filtering |  |
|  | Expiration and Product Monitoring |  |
| **3.13** | **Kahera Accounts Receivable / Customer Debt / Sisingilin** |  |
|  | Customer Debt / Sisingilin Overview |  |
|  | Customer Debt Recording |  |
|  | Customer Debt Payment Management |  |
|  | Paid Customer Debt History |  |
| **3.14** | **Kahera More Tools** |  |
|  | Transaction History |  |
|  | Barcode Scanner |  |
| **3.15** | **Kahera Profile** |  |
|  | User Profile |  |
| **3.16** | **Kahera Settings** |  |
|  | Application Settings |  |

| Milestone 3 \- Development |  |  |
| ----- | :---- | :---- |
| **Number** | **Deliverables** | **Target Date** |
| **1 \- 2** | **Functional Components** |  |
| **MAY-ARI MODULE** |  |  |
| **1.1**  | **Login / Account Access** |  |
|  | May-Ari Account Creation and Validation |  |
|  | Kahera Account Setup |  |
|  | May-Ari Login and Credential Validation |  |
|  | Role-Based Module Access |  |
| **1.2** | **Dashboard** |  |
|  | Pera sa Kaha / Money Tracker |  |
|  | Sales Report Generation |  |
|  | Best-Selling Items Calculation |  |
| **1.3** | **Inventory and Asset Management** |  |
|  | Product Inventory Management |  |
|  | Stock Monitoring and Status Update |  |
|  | Restocking Management |  |
|  | Product Search and Filtering |  |
|  | Expiration and Product Monitoring |  |
|  | Asset Recording and Management |  |
|  | Asset Classification and Value Tracking |  |
| **1.4** | **POS** |  |
|  | Product Selection and Cart Processing |  |
|  | Checkout Processing |  |
|  | Cash Payment Processing |  |
|  | Split Payment Processing |  |
|  | Automatic Stock Deduction after Sale |  |
| **1.5** | **Accounts Receivable and Payable / Customer Debt and Store Debt / Sisingilin at Utang Ko** |  |
|  | Customer Debt Recording and Management |  |
|  | Customer Debt Payment Recording |  |
|  | Customer Debt Status and History |  |
|  | Store Debt Recording and Management |  |
|  | Store Debt Payment Recording |  |
|  | Store Debt Status and History |  |
| **1.6** | **Quick Add / Shortcut Transaction Recording.** |  |
|  | New Sale Recording |  |
|  | Paninda Recording |  |
|  | Asset Recording |  |
|  | Customer Debt Recording |  |
|  | Store Debt Recording |  |
|  | Expense Recording |  |
| **1.7** | **More Tools** |  |
|  | General Journal Generation |  |
|  | General Ledger Generation |  |
|  | Income Statement Generation |  |
|  | Balance Sheet Generation |  |
|  | Transaction History Management |  |
|  | Expense Records Management |  |
|  | Barcode Scanning |  |
| **1.8** | **Profile and Access Control** |  |
|  | User Profile |  |
|  | Kahera Account Management |  |
|  | Access Permission Management |  |
| **1.9**  | **Settings** |  |
|  | Application Settings Management |  |
| **KAHERA MODULE** |  |  |
| **2.1** | **Login / Account Access** |  |
|  | Kahera Login and Credential Validation |  |
|  | May-Ari ID and Kahera PIN Validation |  |
|  | Authorized Module Access. |  |
| **2.2** | **Inventory Management** |  |
|  | Existing Product Information and Quantity Updates |  |
|  | Stock Monitoring and Status Update |  |
|  | Restocking Management |  |
|  | Product Search and Filtering |  |
|  | Expiration and Product Monitoring |  |
| **2.3** | **POS** |  |
|  | Product Selection and Cart Processing |  |
|  | Checkout Processing |  |
|  | Cash Payment Processing |  |
|  | Gcash Payment Processing |  |
|  | Split Payment Processing |  |
|  | Automatic Stock Deduction after Sale |  |
| **2.4** | **Accounts Receivable / Customer Debt / Sisingilin** |  |
|  | Customer Debt Recording |  |
|  | Customer Debt Payment Recording |  |
|  | Customer Debt Status and History |  |
| **2.5** | **More Tools** |  |
|  | Transaction History Viewing, Searching and Filtering. |  |
|  | Barcode Scanning |  |
| **2.6** | **Profile** |  |
|  | User Profile Management |  |
| **2.7** | **Settings** |  |
|  | Application Settings Management |  |

| Milestone 4 \- Testing  |  |  |
| :---- | :---- | :---- |
| **Number** | **Deliverables** | **Target Date** |
| **1** | Functional Component Testing  |  |
| **2** | Usability Testing |  |

| Milestone 5 \- Deployment  |  |  |
| :---- | :---- | :---- |
| **Number** | **Deliverables** | **Target Date** |
| **1** | On-Site Physical Device Sideloading (Guadalupe Nuevo) |  |

4. **Project Organizational Structure**  
   

Identify the key stakeholders and team members by function, name, and role.

| Number | Name | Role | Responsibilities  | Contact Details |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Agustin, Erica Monique S. | Designer | The UI/UX Designer is responsible for designing the application’s interface and user experience, ensuring that it meets the needs of its target users and supports their intended tasks. The responsibilities include: 1\. Understand the application’s scope and requirements by communicating with the Business Analyst and Researcher. 2\. Plan the user experience based on the identified user needs, personas, and concerns. 3\. Develop the application’s layout and user flow through mid- to high-fidelity wireframes and designs. 4\. Design the user interface and create a prototype to demonstrate the intended user experience. 5\. Collaborate with the Programmer and Tester to gather feedback, address usability issues, and improve the design. | [ERICA MONIQUE AGUSTIN](mailto:eagustin.k12254164@umak.edu.ph)  |
| 2 | Ibay, Charles Allen T. | Tester | The Tester is responsible for checking the overall quality of the application, ensuring that it works as intended and aligns with the requirements, design, and user flow. The responsibilities include: 1\. Understand the requirements by communicating with the Business Analyst, Researcher, UI/UX Designer, and Programmer regarding the expected functions, user needs, design, flow, and implementation. 2\. Determine what needs to be tested and how it will be tested by creating appropriate test cases. 3\. Test the application’s functionality, identify bugs and issues, and compare the actual results with the expected behavior. 4\. Retest the application after fixes and provide feedback for improvements until the requirements are satisfied. | [CHARLES ALLEN IBAY](mailto:cibay.a12344942@umak.edu.ph)  |
| 3 | Pedrera, Francesca Denise B. | Designer | The UI/UX Designer is responsible for designing the application’s interface and user experience, ensuring that it meets the needs of its target users and supports their intended tasks. The responsibilities include: 1\. Understand the application’s scope and requirements by communicating with the Business Analyst and Researcher. 2\. Plan the user experience based on the identified user needs, personas, and concerns. 3\. Develop the application’s layout and user flow through mid- to high-fidelity wireframes and designs. 4\. Design the user interface and create a prototype to demonstrate the intended user experience. 5\. Collaborate with the Programmer and Tester to gather feedback, address usability issues, and improve the design. | [FRANCESCA DENISE PEDRERA](mailto:fpedrera.8797@umak.edu.ph) |
| 4 | Sibonga, Jeanice Kyle A. | Business Analyst / Researcher | The Business Analyst / Researcher is responsible for understanding the needs and the problems of the target users, gathering and analyzing relevant information, and translating these findings into clear system requirements and recommendations for the development team. The responsibilities include: 1\. Identify and understand the users’ needs and problems by conducting research, gathering information, and communicating with stakeholders and team members about the goals and expected outcomes of the application. 2\. Analyze the gathered information to determine the appropriate system requirements, features, processes, and user needs that should be addressed by the application. 3\. Document and communicate the requirements to the UI/UX Designer, Programmer, Tester, and other team members to ensure that everyone has a clear understanding of the system’s purpose, functions, and expected user flow. 4\. Conduct research and validate proposed solutions by reviewing existing systems and user feedback to ensure that the application provides a practical and appropriate solution to the identified problem. 5\. Monitor the alignment of the system with the identified requirements and provide recommendations or clarifications whenever changes, issues, or inconsistencies arise during the development and testing process. | [JEANICE KYLE SIBONGA](mailto:jsibonga.k12257397@umak.edu.ph) |
| 5 | Solibio, Alyannah Lyz Y. | Programmer | The Programmer is responsible for efficiently executing the design and functionality of the application through programming, making sure that it follows the designer’s UI and UX design and that it meets the needs of the users. The responsibilities include:  1\. Analyze business requirements and translate them into technical specifications. 2\. Implement software components that are modular, testable, and maintainable.  3\. Ensure that applications adhere to best practices and compliance requirements. 4\. Collaborate with the designer and the project clients to refine requirements. 5\. Work with the tester to define acceptance criteria and support testing efforts. | [ALYANNAH LYZ SOLIBIO](mailto:asolibio.k12254600@umak.edu.ph) |
| 6 | Asst. Prof. Era Marie F. Gannaban, MIT  | Human Computer Interaction and Software Engineering 1 Adviser | The Software Engineering 1 and Human-Computer Interaction professors serve as technical advisers, providing professional guidance on the software development process, system quality, usability, and user-centered design. Their responsibilities include: 1\. Guide software engineering principles, development practices, and methodologies. 2\. Advise on the project’s technical objectives, development process, and implementation. 3\. Recommend appropriate software architecture, technologies, frameworks, and development tools. 4\. Review the system’s functionality, quality, and adherence to software engineering standards. 5\. Evaluate the application’s usability and user experience. 6\. Guide the team in identifying user needs, preferences, and expectations. 7\. Review user personas, user flows, and interaction requirements. 8\. Recommend improvements to the application’s usability, accessibility, and user experience. | [ERA MARIE GANNABAN](mailto:eramarie.gannaban@umak.edu.ph) |
| 7 | Asst. Prof. Christian M. Michael Mansueto, MIS-ITEM  | Elective 1 \- Mobile Application Adviser | The Elective 1 – Mobile Application Adviser provides guidance throughout the mobile application’s development, ensuring that the project remains aligned with its technical requirements and objectives. 1\. Provide technical guidance for the mobile application development. 2\. Review the application design and functionality for alignment with project requirements. 3\. Advise on appropriate mobile development tools and technologies. 4\. Monitor the development progress and provide recommendations when needed. 5\. Review and provide feedback on the implemented system components. 6\. Assist in identifying and resolving technical issues encountered during development and testing. | [CHRISTIAN MICHAEL MANSUETO](mailto:christianmichael.mansueto@umak.edu.ph) |
| 8 | Prof. Cecilia T. Tadeo | Information Security Assurance Adviser | The Information Security Assurance Adviser serves as a technical adviser, guiding to ensure that the application’s security, data protection, and information handling practices are properly implemented throughout the development process. Their responsibilities include: 1\. Guide information security principles and practices. 2\. Advise on appropriate security measures for the application and its data. 3\. Review the application’s authentication, access control, and data protection mechanisms. 4\. Identify potential security risks and recommend appropriate controls. 5\. Review the system for compliance with applicable security requirements and standards. 6\. Provide recommendations to improve the application’s overall security and data protection. | [CECILIA TADEO](mailto:cecilia.tadeo@umak.edu.ph) |
| 9 | Prof. Nomar B.  Maestro, MSCS | Algorithms and Complexity Adviser | The Algorithms and Complexity Adviser serves as a technical adviser, guiding the efficient design and implementation of algorithms used in the application. Their responsibilities include: 1\. Guide algorithm design and computational problem-solving. 2\. Advise on appropriate algorithms and data structures based on system requirements. 3\. Review the efficiency and performance of implemented algorithms. 4\. Analyze the time and space complexity of critical system processes. 5\. Identify potential performance issues and recommend improvements. 6\. Provide recommendations to ensure efficient and scalable system operations. | [Nomar Maestro](mailto:nomar.maestro@umak.edu.ph) |
| 10 | Asst. Prof. Janice Pola D. Congzon, MIT | Modeling and Simulation Adviser | The Modeling and Simulation Adviser serves as a technical adviser, guiding the use of modeling and simulation techniques in analyzing and evaluating the application. Their responsibilities include: 1\. Guide appropriate modeling and simulation techniques. 2\. Advise on models that represent relevant system processes and user interactions. 3\. Review the accuracy and relevance of developed models and simulations. 4\. Assist in identifying variables, processes, and conditions for simulation. 5\. Evaluate simulation results and provide recommendations for improvement. 6\. Ensure that modeling and simulation activities support the project’s objectives. | [JANICE POLA CONGZON](mailto:janicepola.congzon@umak.edu.ph) |
| 11 | Prof. Niño A. Narido, DIT, DASSM | Discrete Structures 2 Adviser | The Discrete Structures 2 Adviser serves as a technical adviser, guiding the application of discrete mathematics and logical concepts in the system’s design and development. Their responsibilities include: 1\. Guide discrete structures and mathematical concepts relevant to the project. 2\. Advise on the use of logic, sets, relations, functions, and graph concepts in system design. 3\. Review the application of appropriate mathematical models and logical approaches. 4\. Assist in analyzing system processes using discrete structures concepts. 5\. Identify potential issues in the logical structure of system processes. 6\. Provide recommendations to improve the accuracy and consistency of system operations. | [Nino Narido](mailto:nino.narido@umak.edu.ph) |
| **12** | Dela Cruz, Ma. Teresa G.  Echanes, Sunshine R. Frias, Anjanette D. Rayos Del Sol, Sabria Rain R.  | Project Client | The Institute of Accountancy and Finance (IAF) students serve as the project clients and subject-matter representatives, providing the research requirements and accounting-related specifications that guide the development of the application. Their responsibilities include: 1\. Provide the research background, identified problems, and requirements that the proposed application aims to address.  2\. Provide the necessary accounting concepts, processes, and specifications required for the system's financial functionalities.  3\. Communicate the target users' needs and the expected features and outcomes of the application. 4\. Review and validate the developed functionalities to ensure that they align with the research objectives and accounting requirements. 5\. Provide feedback and recommendations throughout the development process to support the refinement of the application.  | [MA. TERESA DELA CRUZ](mailto:mdelacruz.7908@umak.edu.ph) [SUNSHINE ECHANES](mailto:sechanes.7926@umak.edu.ph) [ANJANETTE FRIAS](mailto:afrias.8156@umak.edu.ph) [SABRIA RAIN RAYOS DEL SOL](mailto:srayosdelsol.8212@umak.edu.ph) |

5. **Project Authorization**   
   

| No.  | Approved by:  | Role  | Signature | Date  |
| :---- | :---- | :---- | ----- | :---- |
| 1 | Ma. Teresa G.  Dela Cruz | Project Client | ![][image1] | September 14, 2026 |
| 2 | Sunshine R. Echanes | Project Client | ![][image2] | September 14, 2026 |
| 3 | Anjanette D. Frias | Project Client | ![][image3] | September 14, 2026 |
| 4 | Sabria Rain R. Rayos Del Sol | Project Client | ![][image4] | September 14, 2026 |
| 5  | Prof. Era Marie Gannaban | SoftEng1 / HCI Adviser |  |  |

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAACkElEQVR4XuWWwW0cMQxFZSAIjFxzTwGBK0gR9jXpwA2ki1SRMlJJSvEh8XoZD8fU/xRHmhlkvPQHHjx6lEYkdg27nE6n8pYgkR0S2SGRHRLZIZEdEtkhkR0S2SGRHRLZIbEnGvRHQmIvbLB2JCT2wAvuOQoSW8E5J16Ec+Z/QmILEBU5B4ZYkW9gCIo3N/A7fcBzR0BiFAiKR7vAs0dAYgQIiQIDrw3euwUSI2BfKMpOA9tgD6OQ6AXiDea53YL99EKiF4g3HLpvkxvlrxz2gj31QKIHCA6mwcbp4ECa78DeliCxhBM7sB3QRg66h0tc80L7sccIEi2C6IBfwWmoQRP1rbrmCkVZOTSJFk68T1KCbuvAq2rY/9DAJp/K80A30xqHk4x+uteVrROdlzRrOEPXwPiOMx/A4cC4jhpW36pLopqkWcdZ1g6svIeaBgfGtca+3D5/PPOnvPy6SE2fPWxdzsmfMHn+VUy6Bw6Gl+gwt2d+l+fL7aVRs7b2s/hxLzVZqtMMew2swU241rQ+XRvxrZrke4nr1P/eA+OGe8dJ0OFaEw38pbRrc7D/4YH/ba5jB34wzxL92trIeulbIVHXqlUee1yCRAREm8eC1zA1OuUHrPGMDa6pvx5IROB9E+jwWX5+Nt7G22+jd1ANe+uFxBJ4r3n2vsbev4Q2zYGiYE8jkIjAeyfkT1FX0433VIn2YD9rIBGB96OQeHvxPVjXRHuwthYSLSAkNHguYu25LZDwgJDQ4LnXCAkPnKtaOPtfMyQQyEUPK5CoinUufliBxFyoI+JuXjj7LwUSc6FOik9XIDEXGsF9lwaJqphsWIEEkmlYgUR2SGSHRHZIZIdEdkhkh0R2SGSHRHZIZOcJwwGKpeYgg3cAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAqCAYAAADyDQZvAAAExElEQVR4Xu2aTUhUURSAr39pNkM1CGIaKiQyaqMFLtxMrsXCbeAi2rUYiFC3gotAwUULBVuHkDgDLqKkRRpt2gzYxh8KQrEiSyHSSp1r9zzved533o/znDf+zMwHjzv3nHvvm3Peuffc+2YYSz+J/Pz8BBXmcMDn8/0TRcLv938RJaf6HPbwvLw8dNgu1FVlDhva2tp+M6Oz+N7eXoFSz2HF+vr6dVHo61t9ff135n3UwXhej+mKgoICdWZ5BkRZPlYKCwsTop6nNkgFGcEn5rzJycmnLE3357W1tT/Uurw8Qz5tT8d0ARfBAMFxgSpSxcooWk8JGdFW90kr4XD4G0vXfQOBgCmbwpogCtiqHAW7L6rJGxsb56nCDfPz83epzAGINk+XHh05KHUcJAwr4x0ZGxubYtJBYtwSqmf2Tk0aZdobNu3ifkVqXT58Lm1JG7y4uJgaROvJgAbZ9UWj7fQGOjo6NphsW1paqpXCQYVSpo6h1dXMCesaI85NBwmarouKiribo5gSuRz6Ur2C1ka0b7KaQhsbGzXj4+Mvxb15d3c3nmgMDgddV1eX6jzD55aWlk+ynvT3TwWDsX19fR+ozAkRERhpMD1M/UKh0BboxAPS2kGbysrKOfgsHFgtrvM4vfACB0l9McqUB6zVZ2dnbyh92NLSUlitHwdWN6N1J9BhJuPgw/Ly8j3ZBpIOOOWj1GmOrKuri2P7srIymKL6g6BXb2/vM7aPLpNTGLGyJa0YbianXFJfgDgN+6BREDFaXa49ejQp7fULdGtra3eIXOtvVe/v738u6xowphz/eKAZdnV1FaeBI9hPOiGBUxWdg2ueMhUB6gwtwsQYf1WdOBZehLK6unoNZfF4vFnpZ/p+5D7HgzByiyQKiBhDqqeMjo6+EQWPRqMPpUg3CsbC8dAgdHR7e/s7bI9Oxmvv4KgGDsWLLSwshHC8YDD4VRTb+0MYkZF9vMACbrVO2dHa2vqH7Rt7TpWLrPgWShirvLz8PbTBC7Y/aFxPT88EyIaHh++zg0yoOhLQnXeqiUQir0TBp6amNKOoXiXJtVBrIxb+delgQx9wIq53MzMzD0A2NzfXhHpAnBpq1PppRzOGZC0DcvPsOhoWFxcrqSzTcIyoJCMu+5iYmIiJwmqfpiFPGDnHWQFZT2Y6BKPMsFENh8Nbh2XhbMP2DLq5uXlTFHxgYOCRsqE17fxHRkZeK92yg6qqql/MeTomVlZWrlEhIpOL7sQT2WedILbGyvUPXoq6AQ/8rjPymQKmod/vh82uCQ+OOaakkzGUlJQ4OcdJ5wYvxjhd7Ozs3GLOhjnp3IDn2YwCjLpChRJeUVEB/w7wAq8ewqnB6vcJDbFGbXu1TomHc9Vu+3NWMf2cSHDSuQIeQmdn5zSVn0noy06K3FrY6t2QcUc5iIRIJBKlcgWvjM24jbLjnisWi42zFJ0XCATgzS5vbm7+THVnlqGhoRfscMfwYDAIx7SjAuNn1rbksHVOIZk2JuTvD5m1vinwwcHBJ1RogSvj4fcOloFr21FJ1gn6qygR1ZeoMluxdV48Hn+svMcDp+n/EM3BDt6g+Hy+3YaGhp/0vyKhUAj+S5LDjunp6duQAOS1KyLsMm2TLfwHW1F/eGDMp24AAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABJCAYAAACesWDiAAAEqUlEQVR4Xu2ZV6hcRRjHP429x9i7ktj1wd5FNBhINITEgBgTRX1R7L0SxYJdRBGMmhgSE4hiVILEQq4VEezlQRHBF0V8FF+s/x/fjDt32Huze/bqzV2+H/w5c2bOnt0z55uvzJoFQRAEQRAEQRAEQRB0whLpHWm9eiAwmyidLt0hbVSNBeJRaUPpjXog8CX1VWqvKAcCZxtpXmovLQcCZz9p+9R+uxwInIekcdL60nXVWCBeSEcm6fpyIHDIfWAr6YRyIPDQ/mBqH5wUFBDi70rtQ6Qdi7FA7Codndq32BgtMzaTDpA2lzYo+lkek1N7E2kHaXdpZ2mGdLN0iXSP9LH0rvSU9KG0Rlok3S2dZM4N5vcsIQUgiVxnM+yTpT+k96WfpJ+lX6W/pW/T8VPzQvNsaZp0hPkkZeqHLjncfGLhvXLAfPKmpPYD5cBYgKXA8risHugSwvoWqb0yHbn3I9I+6Zzwj8WNKXgIdGM6Z4ll/7Gt+cORHXM8NB1ZfntIu5iXFyzdc6Xx/jF7yXwJP2d+D2ByWJrcf51lkvlSQn8Vx6w89o30m/SB9LB0lXShuR8Bllq93M4o2hSqT5tPJODzWHZYE9baCaPi5CkBgDe9XdHPgxxXnDcB69rXPP/Bv+VkcaH53hAPfOa/Vw8PFvlj3TmabGy+ydULTAATgQUuMM+JTjG/91AwmUwgSzK/POBzd0pbFn2jCn5lt7qzIXPNH7AdbxVt0g2uJaLip2hnWKJ7SXuncyyqjKb/O/iWo+rORLe+AGf9ug22CLhYuqk4x2Hj5C9N59+b+yqc//nmS5ZoyK4AnyX1GLDuou2m0k7mE4xb4bwR3KBd7TRL+qTuXAtMDhZxa9HHJOOkr07nW0uXS6elNhNDrnSktfaRrrSWBZUcZp6pDwUvhnt9ZP4d+EHyuXOki8x/Rw42HcMHcoguIa9hj6cbnk3HU6V7zZNHrIoIOpDGrjD3TYvMH4jrsh/MuVSZbtQ8Zu3/EKD+e958wttB6nGetay2Y3graCR4vGjz0LPN/QnMl46VbkvnL5v/2KGW91DwoANVHxPK/UqYKF4+34dl8odCoyJ6T2tlu70wQTqx7qzAJ2TLYGl3mhfV8Htx7ES6A8192HTpPvMakYBwrY2Qc6cKb2ey3XK8teqxdpB7MSE452PM6zOWIgUxlsQRP4EVEv4pX140L5ApjldJn6c+It0X0i/SD+a5HPdt7IiHA7PHinpltfkfh3PMzfkZ83LjSel+8wI4J5P7my8VMnL8X7YqLCK360jYjpF4sWvlIHPTbwJv7Brzt/mndJYNXue1o2WMqILmme9CYjG3S6+ab9s+YW4lX5tPMI73O/PyhWu+NHfwr5hn3EtTPxF3sfSa+bYK9yVA9AzhttwfagqWw7YHS2O59Lu16jvEwxAVccoIP5Iz7Tpq1RM7quQf2wvUcheYT8Sb0szUj8UMV26MCQiFwznXTvis7ugnplpvS4zKvdzu6DvYhii3P7plvnlO07dQCDZ1ioTiZXVnv0F+0hR2G3uxvr6GpDD/3RxUUHUT0v+T1L5faOq3giAIgiAIgiAIgiAIgiAIgiAIBvMPKlCrSCM0FFkAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEcAAAAdCAIAAAB3x+bZAAACb0lEQVR4Xu2Xu85BQRCA1yVCoiA8iEeQiF4pKqV30XkArVAJpVrnBSQSEgmNRiMhnPNPzrBZM2cvOP6E+Krdmd2d2+4chP+NCCr4Cn5RfQ5viSoej1PR//KWqIR4y7HuRG/evVBCIRaLwUYck8FyuaQ7bUQcled54B+V3nM+n319PUF+uVzy+TxVBMj4vQCqvhF+9NNgjrkE/DgcDuCulHc6HR4YeIy+zudzouLsdjtMAVVEGxUm0g8qRnX3wMpEIkGlvt9oNOSYx+zO8zvB9Ww2WygUpAT8qFaryhIKqSTxm1xdKII1Oz475CqkAhu6lwOng4rbmM1mIGy1WkSOmFsLP02yXq8NWq2CY8jc8XjEAVpaLBakLAYwHaHhDYdD+Wygx2DWXI61rwitDAEtwUp0kaoVxP2Lwo0GR/FAw4JQHltNkMnDZg15xSkCQWYymVQqhWNY0O/31e1QHyyFCLuisKVYLIoH40FC9oxGIypioN/JZBIH3W7XNz4SUO33ezmNBeBYlg5yVKlUeBjpdJpIrNwd0Ww21amOXC4nx6oTursKazabjSrhbV0EXx6oOY+KS6xcN5gfgw5ij0yxW06n08lkosolq9Uq1K5gj7NcLqtTKw+nQeV0OqnTer2Og/F4LCPkmXb5EJFdulugg5p0h3sGjwfMDwYDKeEhuUNuaa/XU6dmnrfq31o5AD8yvABV+0pIiHoCf4oGXjWs4/WQkFqtJsftdlvRmIjGNiJrZWjxTyAbo7h9GK1EGRWy3W6p6GXkzwvHK+C0yBFobqVSiXeRqICQdP8mCRFHRUVRg//5qZRhX/GJ/KL6HP4Ag8VbQf3y3uAAAAAASUVORK5CYII=>