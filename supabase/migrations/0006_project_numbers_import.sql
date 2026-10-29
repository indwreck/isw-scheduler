-- ============================================================================
-- 0006 — Project numbers + import of Chuck's Project Status spreadsheet (2026-10-29)
-- Safe to run more than once: rows whose name already exists are skipped.
-- ============================================================================

alter table projects add column if not exists project_number text not null default '';
create index if not exists projects_number_idx on projects (project_number);

-- ---- Import ----

insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0082', '9010 E State Rte 350-Raytown', array['total']::text[], 'in_permitting', null, 'tentative', 'waiting on Evergy water kill 10-28'
where not exists (select 1 from projects where name = '9010 E State Rte 350-Raytown');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0033', '10, 12, & 14 W 36th St KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'water kills Alex'
where not exists (select 1 from projects where name = '10, 12, & 14 W 36th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0175', '3341 Harvester Rd KCKS', array['total']::text[], 'in_permitting', null, 'tentative', 'water kiill Alex'
where not exists (select 1 from projects where name = '3341 Harvester Rd KCKS');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0180', '3357 Harvester Rd KCKS', array['total']::text[], 'in_permitting', null, 'tentative', 'water kill Alex'
where not exists (select 1 from projects where name = '3357 Harvester Rd KCKS');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0181', '2430 E RD Mize Rd Independence', array['total']::text[], 'in_permitting', null, 'tentative', 'Demo permit in review need down by 11-20'
where not exists (select 1 from projects where name = '2430 E RD Mize Rd Independence');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '5609 E 27th St KCMO DB', array['total']::text[], 'in_permitting', null, 'tentative', 'water kill Alex 10-26 Demo done before 12-1'
where not exists (select 1 from projects where name = '5609 E 27th St KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '1932 Chelsea Ave KCMO DB', array['total']::text[], 'in_permitting', null, 'tentative', 'Demo submit 10-28 Demo done before 12-1'
where not exists (select 1 from projects where name = '1932 Chelsea Ave KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0163', '3235 Peery Ave KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'remove asbestos siding Willy $900'
where not exists (select 1 from projects where name = '3235 Peery Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0116', '7924 Roe Ave Prairie Village-Pool removal', array['selective','total']::text[], 'in_permitting', null, 'tentative', 'submit permit 10-1 inspection 10-28'
where not exists (select 1 from projects where name = '7924 Roe Ave Prairie Village-Pool removal');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0212', '6904 NW MO-9 Hwy KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'remove siding Willy $700. pump septic'
where not exists (select 1 from projects where name = '6904 NW MO-9 Hwy KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0153', '1914 Grand Blvd KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'Evergy wrap install fence water kill Monday 11-2'
where not exists (select 1 from projects where name = '1914 Grand Blvd KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0215', '3510-3520 E 12th St KCMO', array['total']::text[], 'in_permitting', null, 'tentative', ''
where not exists (select 1 from projects where name = '3510-3520 E 12th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0228', '4213 E 58th St KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'remove asabestos siding Willy $900 start 10-21 Done 23'
where not exists (select 1 from projects where name = '4213 E 58th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0129', '613 Forest Ave KCMO', array['total']::text[], 'in_permitting', '2026-10-07', 'confirmed', 'Emergemcy Demo Jimmy down need water kill'
where not exists (select 1 from projects where name = '613 Forest Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0363', '6601 E 93rd St-Phase 2 KCMO', array['total']::text[], 'in_permitting', null, 'tentative', 'water kill'
where not exists (select 1 from projects where name = '6601 E 93rd St-Phase 2 KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0248', '12350 W 87th St. Pkwy, Lenexa Fire Station 6', array['total']::text[], 'in_permitting', null, 'tentative', 'no rush'
where not exists (select 1 from projects where name = '12350 W 87th St. Pkwy, Lenexa Fire Station 6');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0058', '213 SW 6th Ave & 600 SW Van Buren St-Topeka', array['total']::text[], 'in_permitting', null, 'tentative', ''
where not exists (select 1 from projects where name = '213 SW 6th Ave & 600 SW Van Buren St-Topeka');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0242', '2932 Quincy Ave KCMO', array['total']::text[], 'in_permitting', null, 'tentative', ''
where not exists (select 1 from projects where name = '2932 Quincy Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0273', '3911 N Oak Trfwy KCMO', array['total']::text[], 'in_permitting', null, 'tentative', ''
where not exists (select 1 from projects where name = '3911 N Oak Trfwy KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0054', '15200 Kelly Rd Grandview', array['total']::text[], 'ready_to_start', null, 'tentative', 'Demo Permit 10-28 pump septic tank  inspection'
where not exists (select 1 from projects where name = '15200 Kelly Rd Grandview');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0241', '13501 Byars Rd-Grandview Remove Bridge Steel', array['selective']::text[], 'ready_to_start', null, 'tentative', 'waiting on start date'
where not exists (select 1 from projects where name = '13501 Byars Rd-Grandview Remove Bridge Steel');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '5101 E 23rd St KCMO DB', array['total']::text[], 'ready_to_start', '2026-11-17', 'tentative', 'Demo permit 10-23 done before 12-1'
where not exists (select 1 from projects where name = '5101 E 23rd St KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '3019 E 31st St KCMO DB', array['total']::text[], 'ready_to_start', '2026-11-09', 'tentative', 'Demo permit 10-23 done before 12-1'
where not exists (select 1 from projects where name = '3019 E 31st St KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '4902 E 20th St KCMO DB', array['total']::text[], 'ready_to_start', '2026-11-12', 'tentative', 'Demo permit 10-23 done before 12-1'
where not exists (select 1 from projects where name = '4902 E 20th St KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0187', '3202 E 12th St KCMO', array['total']::text[], 'ready_to_start', '2026-11-09', 'tentative', 'Demo Permit 10-22'
where not exists (select 1 from projects where name = '3202 E 12th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0117', '7841 Dearborn Dr-pool-Prairie Village', array['total']::text[], 'ready_to_start', null, 'tentative', 'Demo permit 10-15 pool,backfill, shed, garage  vestibule'
where not exists (select 1 from projects where name = '7841 Dearborn Dr-pool-Prairie Village');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0199', '7403 NW Tomahawk Lane-Platte Woods', array['selective','total']::text[], 'ready_to_start', '2026-10-26', 'tentative', 'Demo permit 10-21'
where not exists (select 1 from projects where name = '7403 NW Tomahawk Lane-Platte Woods');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0216', '3225 Smart Ave KCMO DB tell Terrell', array['total']::text[], 'ready_to_start', '2026-10-27', 'confirmed', 'Demo permit 10-13 Demo start 11-3 Jimmy'
where not exists (select 1 from projects where name = '3225 Smart Ave KCMO DB tell Terrell');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0186', '1413 Bales Ave KCMO', array['total']::text[], 'ready_to_start', '2026-10-29', 'confirmed', 'Demo start by 10-29 Jimmy'
where not exists (select 1 from projects where name = '1413 Bales Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0224', '712 N Montgall Ave-KCMO', array['total']::text[], 'ready_to_start', '2026-11-04', 'confirmed', 'Demo start 11-4 Jimmy'
where not exists (select 1 from projects where name = '712 N Montgall Ave-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0021', '2 E 75th St-St Elizabeth Gathering Ctr-KCMO', array['total']::text[], 'ready_to_start', null, 'tentative', 'Change order #1 Stonewall demo'
where not exists (select 1 from projects where name = '2 E 75th St-St Elizabeth Gathering Ctr-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0285', 'Parade Park Homes Phase 2-15 Bldgs', array['total']::text[], 'awarded', null, 'tentative', 'water kills need signed contract'
where not exists (select 1 from projects where name = 'Parade Park Homes Phase 2-15 Bldgs');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0286', 'Parade Park Homes Phase 3-11 Bldgs', array['total']::text[], 'awarded', null, 'tentative', 'need signed contract'
where not exists (select 1 from projects where name = 'Parade Park Homes Phase 3-11 Bldgs');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0080', '319 Westover Rd KCMO-Bryant Elementary', array['total']::text[], 'awarded', null, 'tentative', 'Eddie Tapper'
where not exists (select 1 from projects where name = '319 Westover Rd KCMO-Bryant Elementary');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0284', '21001 East US 24 Highway-Independence', array['total']::text[], 'awarded', null, 'tentative', 'Daren Fristoe verbal'
where not exists (select 1 from projects where name = '21001 East US 24 Highway-Independence');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0219', '4718 NE Vivion Rd-KCMO', array['total']::text[], 'on_hold', null, 'tentative', 'waiting on new build plans'
where not exists (select 1 from projects where name = '4718 NE Vivion Rd-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0132', '8756b Blue Ridge Blvd KCMO', array['total']::text[], 'on_hold', null, 'tentative', 'waiting on water bill to be paid and abatement approval'
where not exists (select 1 from projects where name = '8756b Blue Ridge Blvd KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0208', '2760 W 151st -house-Overland Park', array['total']::text[], 'on_hold', null, 'tentative', 'client not ready for house demo'
where not exists (select 1 from projects where name = '2760 W 151st -house-Overland Park');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0092', '137th & Kenneth Rd Trees', array['site']::text[], 'on_hold', null, 'tentative', 'Nevin Dewar'
where not exists (select 1 from projects where name = '137th & Kenneth Rd Trees');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '22-0204', '2 E 59th St- Block & Co', array['total']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '2 E 59th St- Block & Co');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '22-0242', '201 South St-Elevator', array['total']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '201 South St-Elevator');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '23-0147', '3828 Broadway Blvd', array['total']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '3828 Broadway Blvd');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '20-0360', '4526 Warwick Blvd-Historical', array['total']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '4526 Warwick Blvd-Historical');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '22-0104', '4637 Genessee St', array['total']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '4637 Genessee St');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '22-0187', '5805 Main St', array['total']::text[], 'on_hold', '2026-06-16', 'confirmed', ''
where not exists (select 1 from projects where name = '5805 Main St');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0235', '7001 E 13th St-garage', array['total']::text[], 'on_hold', '2026-07-01', 'confirmed', ''
where not exists (select 1 from projects where name = '7001 E 13th St-garage');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0130', '940 S 130th St Bonner Spgs', array['total']::text[], 'on_hold', '2026-07-27', 'confirmed', ''
where not exists (select 1 from projects where name = '940 S 130th St Bonner Spgs');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '21-0279', '9526 Lee Blvd', array['total']::text[], 'on_hold', '2026-07-12', 'confirmed', ''
where not exists (select 1 from projects where name = '9526 Lee Blvd');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0168', 'Johnson County Health Service Building 11875 S Sunset Dr', array['total']::text[], 'on_hold', null, 'tentative', 'done with Phase 1 & 2 go back for Phase 3 2027'
where not exists (select 1 from projects where name = 'Johnson County Health Service Building 11875 S Sunset Dr');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0059', '1001 Bedford Ave-Ingredion', array['selective']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '1001 Bedford Ave-Ingredion');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0372', '1601 McGee St', array['selective']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '1601 McGee St');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '23-0229', '1601 W 23rd St', array['selective']::text[], 'on_hold', null, 'tentative', ''
where not exists (select 1 from projects where name = '1601 W 23rd St');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0258', '3210 E 85th St KCMO', array['selective']::text[], 'active', '2026-10-19', 'tentative', 'remove exterior air duct equipment- Danny-machine'
where not exists (select 1 from projects where name = '3210 E 85th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0294', '3521 Baltimore Ave KCMO', array['total']::text[], 'active', '2026-10-07', 'tentative', 'start 10-7 Casey'
where not exists (select 1 from projects where name = '3521 Baltimore Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0032', '3550 Main St KCMO', array['total']::text[], 'active', null, 'tentative', 'Demo permit 10-15 Start 10-15 Robbie'
where not exists (select 1 from projects where name = '3550 Main St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0222', '1 Pfizer Way-Zoetis Lee''s Summit', array['total']::text[], 'active', null, 'tentative', 'Demo permit 10-12, Demo start 10-14-JImmy, Robbie'
where not exists (select 1 from projects where name = '1 Pfizer Way-Zoetis Lee''s Summit');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0319', '1610 N 8th St- KCKS-Sumner Academy', array['total']::text[], 'active', null, 'tentative', 'Cut one doorway in then complete'
where not exists (select 1 from projects where name = '1610 N 8th St- KCKS-Sumner Academy');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0077', '6961 N Olive St-Gladstone-Maintenance-David 913-286-0203', array['selective']::text[], 'active', '2026-10-26', 'tentative', 'Go back remove 1st floor wood leaving foundation'
where not exists (select 1 from projects where name = '6961 N Olive St-Gladstone-Maintenance-David 913-286-0203');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0215', '5700 Belinder Rd-Fairway', array['total']::text[], 'active', '2026-11-09', 'tentative', 'We need to go back 11/9'
where not exists (select 1 from projects where name = '5700 Belinder Rd-Fairway');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0383', '220 W 43rd St-Embassy Suites', array['total']::text[], 'active', '2026-07-12', 'confirmed', 'Haulout colton billy  haul out finish by 12-1'
where not exists (select 1 from projects where name = '220 W 43rd St-Embassy Suites');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0296', '2601 E Truman Rd-KCMO', array['total']::text[], 'active', '2026-08-10', 'confirmed', 'Josh Do not seed and straw or call final ask Chuck'
where not exists (select 1 from projects where name = '2601 E Truman Rd-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0014', '101 E Kansas St. Liberty-Police Renovation', array['selective']::text[], 'active', '2026-08-17', 'tentative', ''
where not exists (select 1 from projects where name = '101 E Kansas St. Liberty-Police Renovation');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0138', 'Mission Beverly Mission, KS', array['selective','total']::text[], 'active', '2026-09-14', 'confirmed', 'go back move dirt and finish concrete'
where not exists (select 1 from projects where name = 'Mission Beverly Mission, KS');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0347', '709 Forest Ave KCMO', array['selective']::text[], 'active', '2026-10-13', 'confirmed', 'Danny toilet delivered 10-13'
where not exists (select 1 from projects where name = '709 Forest Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0238', '10414 N Dallas Ave KCMO', array['total']::text[], 'completed', null, 'tentative', ''
where not exists (select 1 from projects where name = '10414 N Dallas Ave KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0051', '10016 E State Route 350-Raytown', array['total']::text[], 'completed', '2026-09-21', 'confirmed', ''
where not exists (select 1 from projects where name = '10016 E State Route 350-Raytown');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0172', '498 Route 291-7Brew Lee''s Summit', array['total']::text[], 'completed', '2026-10-27', 'confirmed', ''
where not exists (select 1 from projects where name = '498 Route 291-7Brew Lee''s Summit');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0195', '1216 N 86th St-KCKS', array['total']::text[], 'completed', '2026-09-21', 'confirmed', ''
where not exists (select 1 from projects where name = '1216 N 86th St-KCKS');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0173', '601 E 3rd St/311 Cherry St KCMO', array['selective']::text[], 'completed', '2026-09-10', 'confirmed', ''
where not exists (select 1 from projects where name = '601 E 3rd St/311 Cherry St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0373', '203 E Martin St Edgerton', array['total']::text[], 'completed', '2026-09-03', 'confirmed', ''
where not exists (select 1 from projects where name = '203 E Martin St Edgerton');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0015', '4222 Wornall Rd-KCMO', array['total']::text[], 'completed', '2026-09-03', 'confirmed', ''
where not exists (select 1 from projects where name = '4222 Wornall Rd-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0157', '800 W 61st St-KCMO', array['total']::text[], 'completed', '2026-08-17', 'confirmed', 'new build permit 9-25 final 9-28'
where not exists (select 1 from projects where name = '800 W 61st St-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0369', 'Parade Park Homes-Phase 1-20 Bldgs.', array['total']::text[], 'completed', '2026-08-17', 'confirmed', ''
where not exists (select 1 from projects where name = 'Parade Park Homes-Phase 1-20 Bldgs.');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0178', '604 W 47th St KCMO', array['selective']::text[], 'completed', '2026-08-07', 'tentative', ''
where not exists (select 1 from projects where name = '604 W 47th St KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0008', 'Olathe-1985 E Santa Fe trac #47, #13', array['total']::text[], 'completed', '2026-08-06', 'tentative', ''
where not exists (select 1 from projects where name = 'Olathe-1985 E Santa Fe trac #47, #13');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0157', '4015 Prospect Ave KCMO DB', array['total']::text[], 'completed', '2026-07-20', 'tentative', ''
where not exists (select 1 from projects where name = '4015 Prospect Ave KCMO DB');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0198', 'Parade Park Homes- 42 Test Pits', array['selective']::text[], 'completed', '2026-07-29', 'tentative', ''
where not exists (select 1 from projects where name = 'Parade Park Homes- 42 Test Pits');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0143', '12303 Byars Rd-Grandview', array['total']::text[], 'completed', '2026-07-23', 'tentative', ''
where not exists (select 1 from projects where name = '12303 Byars Rd-Grandview');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0112', '200 W Santa Fe-Char Bar-Olathe', array['selective','total']::text[], 'completed', '2026-07-09', 'tentative', ''
where not exists (select 1 from projects where name = '200 W Santa Fe-Char Bar-Olathe');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '24-0236', '8736 Blue Ridge Blvd-KCMO', array['total']::text[], 'completed', '2026-06-16', 'tentative', ''
where not exists (select 1 from projects where name = '8736 Blue Ridge Blvd-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0191', '9211 NE 136th St-Liberty', array['total']::text[], 'completed', '2026-07-06', 'tentative', ''
where not exists (select 1 from projects where name = '9211 NE 136th St-Liberty');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0046', '4900 W 119th St-Houlihan''s-Leawood', array['total']::text[], 'completed', '2026-07-08', 'tentative', ''
where not exists (select 1 from projects where name = '4900 W 119th St-Houlihan''s-Leawood');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '25-0336', '1700 Independence Ave-KC University-KCMO', array['total']::text[], 'completed', '2026-08-14', 'tentative', ''
where not exists (select 1 from projects where name = '1700 Independence Ave-KC University-KCMO');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0113', '1213 N Davis Rd-Independence', array['total']::text[], 'completed', '2026-07-13', 'tentative', ''
where not exists (select 1 from projects where name = '1213 N Davis Rd-Independence');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0188', '7425 & 7471 Quivira Rd Shawnee', array['selective']::text[], 'completed', null, 'tentative', ''
where not exists (select 1 from projects where name = '7425 & 7471 Quivira Rd Shawnee');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0101', '5632 E 11th St KCMO house and garage', array['total']::text[], 'completed', null, 'tentative', ''
where not exists (select 1 from projects where name = '5632 E 11th St KCMO house and garage');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0232', '14943 Andrews Rd-KCMO Exterior Gate', array['selective']::text[], 'completed', '2026-08-28', 'confirmed', ''
where not exists (select 1 from projects where name = '14943 Andrews Rd-KCMO Exterior Gate');
insert into projects (project_number, name, work_types, status, planned_start, start_type, notes)
select '26-0275', '3236 Benton Blvd', array['selective']::text[], 'completed', '2026-10-20', 'confirmed', 'Fire emergency for Dangerous Buildings T&M'
where not exists (select 1 from projects where name = '3236 Benton Blvd');

-- Standard permit checklist for total-demo jobs still in permitting (skips jobs that already have items)
insert into project_permits (project_id, item, sort_order)
select p.id, i.item, i.ord
from projects p
cross join (values ('Water disconnect',1),('Fire protection line',2),('Gas disconnect',3),('Electric disconnect',4),('Demolition permit',5)) as i(item, ord)
where p.status = 'in_permitting' and 'total' = any(p.work_types)
  and not exists (select 1 from project_permits x where x.project_id = p.id);
