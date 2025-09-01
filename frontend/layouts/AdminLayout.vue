<template>
  <DashboardLayout>
    <template #sidebar>
      <nav class="space-y-2">
        <router-link to="/admin/dashboard">Admin</router-link>
        <router-link to="/admin/users">Users</router-link>
        <router-link to="/admin/partners">Partners</router-link>
        <router-link to="/admin/moderation">Moderation</router-link>
        <router-link to="/admin/taxonomy">Taxonomy</router-link>
        <router-link to="/admin/reports">Reports</router-link>
        <router-link to="/admin/payouts-health">Payouts Health</router-link>
        <router-link to="/admin/flags">Feature Flags</router-link>
        <router-link to="/admin/audit">Audit</router-link>

        <details open>
          <summary>Accounting</summary>
          <div class="ml-3 flex flex-col gap-1">
            <router-link to="/admin/accounting">Overview</router-link>
            <router-link to="/admin/accounting/chart-of-accounts">Chart of Accounts</router-link>
            <router-link to="/admin/accounting/journal">Journal</router-link>
            <router-link to="/admin/accounting/invoices">Invoices</router-link>
            <router-link to="/admin/accounting/bills">Bills</router-link>
            <router-link to="/admin/accounting/receipts">Receipts</router-link>
            <router-link to="/admin/accounting/payouts">Payouts</router-link>
            <router-link to="/admin/accounting/reconciliation">Reconciliation</router-link>
            <router-link to="/admin/accounting/taxes">Taxes</router-link>
            <router-link to="/admin/accounting/reports">Financial Reports</router-link>
          </div>
        </details>
      </nav>
    </template>

    <router-view />
  </DashboardLayout>
</template>

<script setup lang="ts">
import DashboardLayout from './DashboardLayout.vue';
</script>
