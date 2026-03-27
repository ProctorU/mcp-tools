Feature: Make sure to support both data formats for solver solution file

Background:
  Given I am logged in as an admin user
  And LOFT Form Creation and Rasch Scoring is enabled in the account settings
  And an exam exists using Rasch methodology with some generated forms
  And the generated forms are displayed correctly in the UI

Scenario: Old or legacy solver format is correctly displayed in the UI
  Given a solver solution file uses the old or legacy format with result and target in one cell
  When I view the batch review summary and each exam form view
  Then the forms should be displayed correctly in the UI
  And the summary view should show Form, Cut Score, Status, and TIF/TCC values as in the legacy format

Scenario: New solver format is correctly displayed in the UI
  Given a solver solution file uses the new format with result and target in separate cells
  When I view the batch review summary and each exam form view
  Then the forms should be displayed correctly in the UI
  And the summary view should show separate "Target" and "Result" columns for each TIF and TCC value

Scenario: Save All Forms works for old or legacy solver solution
  Given a batch of exam forms was generated using the old or legacy solver format
  When I click the "Save All Forms" button
  Then the forms should be saved in the same way as they are saved today
  And no errors should occur

Scenario: Save All Forms works for new solver solution
  Given a batch of exam forms was generated using the new solver format
  When I click the "Save All Forms" button
  Then the forms should be saved in the same way as they are saved today
  And no errors should occur

Scenario: Download Items Report works for old or legacy solver solution
  Given a batch of exam forms was generated using the old or legacy solver format
  When I click the "Download Items Report" button
  Then the report should be downloaded
  And the report should look the same as it does today
  And no errors should occur

Scenario: Download Items Report works for new solver solution
  Given a batch of exam forms was generated using the new solver format
  When I click the "Download Items Report" button
  Then the report should be downloaded
  And the report should look the same as it does today
  And no errors should occur

Scenario: Experimental items injection works with old or legacy solver format
  Given the solver uses the old or legacy solution file format
  When experimental items are injected into the solver solution
  Then the resulting solution should display properly in the UI
  And forms should be displayed correctly
  And "Save All Forms" and "Download Items Report" should work without errors

Scenario: Experimental items injection works with new solver format
  Given the solver uses the new solution file format with separate Target and Result cells
  When experimental items are injected into the solver solution
  Then the resulting solution should display properly in the UI
  And forms should be displayed correctly
  And "Save All Forms" and "Download Items Report" should work without errors

Scenario: New batch generated from solver displays correctly for legacy format
  Given an exam has existing forms in the old or legacy format
  When I create a new batch of exam forms using the solver and wait until they are generated
  Then the new forms should be displayed correctly in the UI
  And the summary view and each exam form view should show the correct data

Scenario: New batch generated from solver displays correctly for new format
  Given an exam has existing forms in the new format
  When I create a new batch of exam forms using the solver and wait until they are generated
  Then the new forms should be displayed correctly in the UI
  And the summary view and each exam form view should show Target and Result in separate cells
