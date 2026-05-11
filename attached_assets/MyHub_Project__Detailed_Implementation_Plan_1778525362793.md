# MyHub Project: Detailed Implementation Plan

This document outlines a comprehensive plan for implementing the requested changes to the MyHub project. Each modification is broken down into actionable steps, referencing relevant files identified during the initial project analysis.

## 1. Icon and Logo Updates

**Current State:** The project uses a generic `favicon.svg` and a `Monitor` icon component (`lucide-react`) for branding in various layouts and login/register screens. The primary color is defined in `index.css` as `--primary`.

**Requested Change:** Replace the current icon with a new SVG logo, ensuring it adopts the project's color pattern.

**Implementation Plan:**

1.  **Prepare the New SVG Logo:** Obtain the new SVG logo file. It should ideally be designed to inherit colors via CSS `currentColor` or accept a `fill` property, allowing it to adapt to the project's theme.

2.  **Replace `favicon.svg`:**
    *   Place the new SVG logo file in `MyHub/artifacts/myhub/public/` and rename it to `favicon.svg`, overwriting the existing file.
    *   Ensure the SVG content is optimized and does not contain hardcoded colors that would prevent it from adopting the `--primary` color.

3.  **Update `customer-layout.tsx`:**
    *   **File:** `MyHub/artifacts/myhub/src/components/layout/customer-layout.tsx`
    *   **Action:** Locate lines 28-30 and 80-83 where the `Monitor` icon is used for the logo. Replace the `Monitor` component with an `img` tag pointing to the new `favicon.svg` or an inline SVG component if the logo is simple enough and needs dynamic coloring. If using an `img` tag, ensure the SVG itself uses `currentColor` or is styled to match the primary color.
    *   **Example (Conceptual, assuming new SVG is inlined or styled via CSS):**
        ```typescript
        // Original (line 28-30)
        <div className="bg-primary/10 p-1.5 rounded-lg">
          <Monitor className="w-5 h-5 text-primary" />
        </div>

        // Proposed change (replace Monitor with new SVG component or img)
        <div className="bg-primary/10 p-1.5 rounded-lg">
          {/* Assuming NewLogoSVG is a component that renders your SVG */}
          <NewLogoSVG className="w-5 h-5 text-primary" /> 
          {/* OR if using img tag, ensure favicon.svg is styled to match */}
          {/* <img src="/favicon.svg" alt="MyHUB Logo" className="w-5 h-5 text-primary" /> */}
        </div>
        ```

4.  **Update `admin-layout.tsx`:**
    *   **File:** `MyHub/artifacts/myhub/src/components/layout/admin-layout.tsx`
    *   **Action:** Locate lines 52-53 where the `Monitor` icon is used for the admin logo. Apply the same replacement strategy as for `customer-layout.tsx`.

5.  **Update `login.tsx` and `register.tsx`:**
    *   **Files:** `MyHub/artifacts/myhub/src/pages/login.tsx`, `MyHub/artifacts/myhub/src/pages/register.tsx`
    *   **Action:** Find instances of `Monitor` icon usage (e.g., `login.tsx` line 180-181, `register.tsx` line 101-102) and replace them with the new SVG logo component or `img` tag.

## 2. Hero Section Button Reorganization

**Current State:** The `home.tsx` hero section displays a 
Sign In button for logged-out users and a My Reservations button for logged-in users. The 
Sign In button for logged-out users and a My Reservations button for logged-in users. The "Reserve a Table" button is always present.

**Requested Change:** Remove the "Sign In" button from the hero screen. For logged-in users, move the "My Reservations" button to the "Live Table Status" section, next to the "Reserve a Table" button.

**Implementation Plan:**

1.  **Modify `home.tsx` Hero Section:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/home.tsx`
    *   **Action:** Locate lines 67-81, which conditionally render the "My Reservations" or "Sign In" buttons. Remove the entire conditional block. The "Reserve a Table" button (lines 61-66) should remain.

2.  **Add "My Reservations" to Live Table Status Section:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/home.tsx`
    *   **Action:** Locate lines 131-136, which contain the "Make a Reservation" button. Add a conditional rendering block here for the "My Reservations" button, similar to the original hero section logic, ensuring it only appears when `isLoggedIn` is true.
    *   **Example (Conceptual):**
        ```typescript
        // Original (lines 131-136)
        <Link href="/reservation">
          <Button variant="outline" className="shrink-0">
            <CalendarCheck className="w-4 h-4 mr-2" />
            Make a Reservation
          </Button>
        </Link>

        // Proposed change
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <Link href="/reservation">
            <Button variant="outline" className="shrink-0">
              <CalendarCheck className="w-4 h-4 mr-2" />
              Make a Reservation
            </Button>
          </Link>
          {isLoggedIn && (
            <Link href="/my-reservations">
              <Button variant="outline" className="shrink-0">
                <UserCircle className="w-4 h-4 mr-2" />
                My Reservations
              </Button>
            </Link>
          )}
        </div>
        ```

## 3. Unified Login Screen and Admin Email Removal

**Current State:** The `login.tsx` file uses `Tabs` to separate customer and admin login forms. The customer login requires an email, while the admin login requires a username.

**Requested Change:** Create a single login screen. Remove the requirement for an email for admin users, as it's not relevant to their login process.

**Implementation Plan:**

1.  **Modify `login.tsx` to Unify Forms:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/login.tsx`
    *   **Action:** Remove the `Tabs` component (lines 185-208) and integrate the logic for both customer and admin login into a single form. This will likely involve using a state variable to determine which login type is active (e.g., a toggle or radio buttons) or merging the fields if both types of users can log in with the same form fields.
    *   **Consideration:** Since the request implies a single login screen, it's best to have a single form that can handle both. The admin login uses `username` and `password`, while customer uses `email` and `password`. A common approach would be to use a single input field that can accept either an email or a username, and then determine the login type on submission. However, the request specifically mentions removing the email requirement for admin, implying the admin login should remain distinct but without the email field. The most straightforward interpretation is to remove the tab structure and present a single form that allows login with either email/password (for customers) or username/password (for admins), or to default to customer login and provide a clear link/toggle for admin login.

2.  **Remove Email Requirement for Admin Login:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/login.tsx`
    *   **Action:** The `AdminLoginForm` (lines 114-171) already uses `username` and `password` based on `adminSchema`. The change here is primarily about ensuring that the unified login screen doesn't force an email input for admin users. If the forms are merged, the input field for the identifier should be flexible enough to accept either an email or a username, and the validation logic should adapt accordingly.

## 4. Reservation Calendar and Table Status Enhancements

**Current State:** The reservation calendar (`reservation.tsx`) displays a heatmap for date availability. The table selection step shows the current table status, not the status at the chosen hour, and uses yellow for "reserved".

**Requested Change:** Apply the heatmap concept to time slots in the next step (Step 2), without repeating the color legend. In the table selection step (Step 3), show table status according to the chosen hour, using red for unavailable and green for available, without a "reserved" yellow state.

**Implementation Plan:**

1.  **Implement Time Slot Heatmap:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/reservation.tsx`
    *   **Action:** In Step 2 (lines 266-307), modify the rendering of `TIME_SLOTS` buttons. For each time slot, calculate its availability based on `reservationMap` and `TOTAL_TABLES` (similar to `getDayStatus` for dates). Apply CSS classes (e.g., `bg-green-200`, `bg-red-400`) to visually represent availability (green for available, red for full/unavailable). The legend should not be repeated.
    *   **Logic:** For each `slot`, determine `slotCounts[slot]` and compare it to `TOTAL_TABLES`. If `slotCounts[slot] >= TOTAL_TABLES`, the slot is full (red). Otherwise, it's available (green).

2.  **Dynamic Table Status in Selection Step:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/reservation.tsx`
    *   **Action:** In Step 3 (lines 310-364), when rendering each `table` (lines 325-352), the `isOccupied` logic needs to be updated. Instead of `table.status === 
```typescript
// Original (line 326)
const isOccupied = table.status === "occupied";

// Proposed change: Determine availability based on selectedDate and selectedTime
const isAvailableAtSelectedTime = useMemo(() => {
  if (!selectedDate || !selectedTime) return false; // Or handle as disabled
  const dateTimeKey = format(selectedDate, "yyyy-MM-dd") + "-" + selectedTime;
  // You'll need a new memoized map for table-specific reservations at specific times
  // For now, assume a simplified check based on overall slot availability
  const reservationsForSlot = reservationMap[format(selectedDate, "yyyy-MM-dd")]?.[selectedTime] || 0;
  return reservationsForSlot < TOTAL_TABLES; // If there's space in the slot
}, [selectedDate, selectedTime, reservationMap, TOTAL_TABLES]);

const isTableAvailable = isAvailableAtSelectedTime && table.status !== "occupied"; // Combine with actual table status
const isSelected = selectedTableId === table.id;

// Update the className logic (lines 333-339) to use isTableAvailable
// Red for unavailable, green for available, no yellow for 'reserved' in this view
className={`p-4 rounded-xl border-2 text-left transition-all ${
  !isTableAvailable
    ? "opacity-50 cursor-not-allowed bg-destructive/5 border-destructive/20"
    : isSelected
    ? "bg-primary/10 border-primary shadow-sm"
    : "bg-card border-border hover:border-primary/50"
}`}

// Update the status indicator (line 343)
<div className={`w-2.5 h-2.5 rounded-full ${isTableAvailable ? "bg-emerald-500" : "bg-red-500"}`} />

// Update the text status (line 348)
{!isTableAvailable && <span className="text-xs text-destructive font-medium mt-1 block">Unavailable</span>}
```

## 5. Admin Dashboard Enhancements

**Current State:** The admin dashboard (`dashboard.tsx`) displays summary statistics, recent orders, system health, and a reservation traffic heatmap.

**Requested Change:** Add an "analysis board" to the hero section of the admin dashboard to make it feel like a real admin dashboard.

**Implementation Plan:**

1.  **Identify Hero Section:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/admin/dashboard.tsx`
    *   **Action:** The current hero section is likely the `div` containing the `h1` and `p` tags (lines 100-103). The stats cards (lines 105-129) already provide some analytical data.

2.  **Integrate More Analysis/Visualizations:**
    *   **Action:** To enhance the "analysis board" feel, consider adding more data visualizations or key performance indicators (KPIs) directly within or immediately below the existing summary cards. This could involve:
        *   **Charts:** Using a charting library (e.g., Recharts, Chart.js if not already in use, or custom SVG charts) to display trends over time (e.g., daily revenue, reservations per day, peak hours).
        *   **Key Metrics:** Displaying metrics like average order value, customer retention (if data is available), or table utilization rates.
        *   **Filtering/Date Range Selection:** Adding controls to allow admins to filter the dashboard data by date range.
    *   **Example (Conceptual - adding a simple chart):**
        ```typescript
        // Inside AdminDashboard component, after statsCards
        <Card className="lg:col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Daily Revenue Trend</CardTitle>
            <CardDescription>Revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for a chart component */}
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              [Chart Placeholder]
            </div>
          </CardContent>
        </Card>
        ```
    *   **Note:** The `useGetTrafficHeatmap` hook already provides data that could be visualized differently or expanded upon (e.g., showing daily trends for specific hours).

## 6. Pay for Table Section in Admin Dashboard

**Current State:** No dedicated section for generating QR codes for payment.

**Requested Change:** Add a "Pay for Table" section to the admin dashboard menu. This section should allow admins to choose a table, generate a QR code for a `payiBouraq` link (with the last two digits of the link representing the amount), and then, upon admin approval, empty the table.

**Implementation Plan:**

1.  **Add New Navigation Item:**
    *   **File:** `MyHub/artifacts/myhub/src/components/layout/admin-layout.tsx`
    *   **Action:** Add a new item to the `navItems` array (lines 39-44) for "Pay for Table" with a new route, e.g., `/admin/pay-table` and an appropriate icon (e.g., `CreditCard`).

2.  **Create New Admin Page:**
    *   **File:** Create a new file, e.g., `MyHub/artifacts/myhub/src/pages/admin/pay-table.tsx`.
    *   **Content:** This page will contain:
        *   A list or grid of tables (similar to `admin/tables.tsx` or `home.tsx` table grid).
        *   For each table, an input field or selection mechanism to enter the amount to be paid.
        *   A button to generate the QR code.
        *   Display area for the generated QR code (using `QRCodeSVG` component, similar to `home.tsx`).
        *   A button for "Approve Payment" (or similar) that, when clicked, would trigger an API call to update the table status to `available` and potentially mark the associated order as paid.

3.  **QR Code Generation Logic:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/admin/pay-table.tsx`
    *   **Logic:** The `payiBouraq` link will be a base URL (provided by the user later) with the last two digits representing the amount. The component will need to construct this URL dynamically based on the entered amount and then pass it to the `QRCodeSVG` component.
    *   **Example (Conceptual):**
        ```typescript
        const payiBouraqBaseUrl = "https://pay.ibouraq.com/link/"; // User will update this
        const amount = 12.50; // Example amount
        const amountString = (amount * 100).toFixed(0).padStart(2, '0'); // Convert to cents and pad
        const qrLink = `${payiBouraqBaseUrl}${amountString}`;
        // Then use <QRCodeSVG value={qrLink} ... />
        ```

4.  **Table Emptying on Approval:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/admin/pay-table.tsx`
    *   **Logic:** When the admin approves the payment, an API call will be needed to update the status of the selected table to `available`. This will likely involve using the `useUpdateTable` mutation from `@workspace/api-client-react` (similar to `admin/tables.tsx`). Additionally, if there's an associated order, its payment status should be updated.

## 7. Automatic Reservation Expiry

**Current State:** Reservations remain active until manually changed.

**Requested Change:** Make reserved tables become free if the reservation time passes by 10 minutes.

**Implementation Plan:**

1.  **Backend Service/Cron Job:**
    *   **Action:** This functionality should primarily be handled on the backend to ensure reliability and prevent client-side manipulation. A new backend service or a scheduled cron job will be required.
    *   **Logic:** This service would periodically (e.g., every minute) query the database for reservations that meet the following criteria:
        *   `status` is `reserved`.
        *   `dateTime` (the reservation start time) plus 10 minutes is in the past.
    *   For each such reservation, the service would:
        *   Update the reservation `status` to `expired` or `cancelled`.
        *   Update the associated `table`'s `status` to `available`.

2.  **API Integration (Optional Frontend Display):**
    *   **Action:** While the core logic is backend, the frontend might need to reflect this change. The `useGetTables` and `useGetReservations` hooks already poll for updates, so tables should automatically update their status on the frontend once the backend process runs.

## 8. Supabase Authentication and Naming Issues

**Current State:**
*   **User Existence Check:** Supabase `signUp` proceeds even if a user with the email already exists, without sending a new verification email.
*   **Username Display:** The user's name doesn't show in the username parts after login, despite the Supabase table having a `Display name` (though `use-auth.tsx` reads `customer.name`).

**Requested Change:** Add verification if a user exists during registration to prevent continuing the process. Ensure the user's name displays correctly after login.

**Implementation Plan:**

1.  **User Existence Check During Registration:**
    *   **File:** `MyHub/artifacts/myhub/src/pages/register.tsx`
    *   **Action:** Before calling `supabase.auth.signUp`, implement a check to see if a user with the provided email already exists. Supabase's `getUserByEmail` (or similar admin API if available and appropriate) or a direct query to your `customers` table could be used.
    *   **Logic:**
        1.  When `onSubmit` is called, query the `customers` table or use a Supabase function to check for an existing user with `data.email`.
        2.  If a user exists, display a toast message indicating that the email is already registered and prevent the `signUp` call.
        3.  If no user exists, proceed with `supabase.auth.signUp`.
    *   **Consideration:** Supabase's `signUp` function *does* handle existing users by not creating a new one and not sending a new email if one was already sent. The issue might be that the frontend doesn't receive a distinct error code for 
an already registered email, leading to the `isEmailSent` state being set incorrectly. A more robust solution might involve checking the `error` object from `supabase.auth.signUp` for specific messages or codes indicating an existing user.

2.  **Correct User Name Display After Login:**
    *   **Files:** `MyHub/artifacts/myhub/src/hooks/use-auth.tsx`, `MyHub/artifacts/myhub/src/pages/register.tsx`, `MyHub/artifacts/myhub/src/components/layout/customer-layout.tsx`
    *   **Analysis:**
        *   `use-auth.tsx` (lines 19-20, 42, 82) shows that `customer.name` is used for display, and this `customer` object comes from `useGetCustomerMe()`. The `CustomerProfile` interface (lines 9-14) also defines `name: string`.
        *   `register.tsx` (lines 48-51) passes `full_name: data.name` to `supabase.auth.signUp` options. This `full_name` is typically stored in Supabase's `user_metadata`.
        *   The issue likely stems from how the `customer` object (specifically its `name` field) is populated from Supabase's `user_metadata` or the `customers` database table. The `useGetCustomerMe` hook (which is part of `@workspace/api-client-react`) is responsible for fetching this `customer` data.
    *   **Action:**
        1.  **Verify `useGetCustomerMe` Implementation:** Examine the backend implementation of `useGetCustomerMe` (or the API endpoint it calls) to understand how it retrieves the customer's name. It should be pulling the `name` from the `customers` table, which in turn should be populated from the `full_name` in Supabase `user_metadata` during the registration/user creation process.
        2.  **Ensure `customers` Table Population:** Confirm that when a user registers via Supabase, their `full_name` from `user_metadata` is correctly inserted into the `name` column of the `customers` table. This might involve a Supabase trigger or a backend function that syncs Supabase `auth.users` with your `public.customers` table.
        3.  **Update `customer-layout.tsx`:** The `customer?.name?.split(" ")[0]` (line 42) in `customer-layout.tsx` is correctly attempting to display the first name. The problem is upstream in data population. Once the `customer.name` field is correctly populated, this display should work as intended.

## References

*   [1] Supabase Documentation: [https://supabase.com/docs](https://supabase.com/docs)
*   [2] Lucide React Icons: [https://lucide.dev/](https://lucide.dev/)
*   [3] React Hook Form: [https://react-hook-form.com/](https://react-hook-form.com/)
*   [4] Zod: [https://zod.dev/](https://zod.dev/)
*   [5] Tailwind CSS: [https://tailwindcss.com/](https://tailwindcss.com/)
*   [6] Drizzle ORM: [https://orm.drizzle.team/](https://orm.drizzle.team/)
*   [7] QRCode.react: [https://www.npmjs.com/package/qrcode.react](https://www.npmjs.com/package/qrcode.react)
