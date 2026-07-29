/*
# Create government schemes directory

1. Purpose
   Adds a browsable reference directory of genuine Indian government welfare
   schemes (PM-KISAN, MUDRA, PMKVY, etc.) so users can verify whether a
   "scheme offer" they received is real. Scammers frequently impersonate these
   schemes to collect registration fees and personal data.

2. New Table
   - `gov_schemes`
     - id (uuid, primary key)
     - name (text)            – official scheme name
     - ministry (text)        – administering ministry/department
     - category (text)        – Employment / Welfare / Skill / Finance / Agriculture
     - eligibility (text)     – short eligibility summary
     - benefits (text)        – what the scheme provides
     - official_url (text)    – canonical .gov.in / .nic.in portal
     - is_free (boolean)      – whether the scheme charges no fee (most do not)
     - verified (boolean)     – confirmed genuine
     - created_at (timestamptz)

3. Security
   - Enable RLS on gov_schemes.
   - Public read (anon + authenticated) — reference data, same pattern as
     gov_notifications and blacklisted_domains.
   - Authenticated insert/update/delete (admin-maintained reference data).

4. Seed Data
   - 18 genuine central-government schemes across 5 categories.
*/

CREATE TABLE IF NOT EXISTS gov_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ministry text NOT NULL,
  category text NOT NULL CHECK (category IN ('Employment','Welfare','Skill','Finance','Agriculture')),
  eligibility text NOT NULL,
  benefits text NOT NULL,
  official_url text NOT NULL,
  is_free boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gov_schemes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gov_schemes_category ON gov_schemes(category);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_name ON gov_schemes(name);

DROP POLICY IF EXISTS "public_read_gov_schemes" ON gov_schemes;
CREATE POLICY "public_read_gov_schemes" ON gov_schemes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_gov_schemes" ON gov_schemes;
CREATE POLICY "auth_insert_gov_schemes" ON gov_schemes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_gov_schemes" ON gov_schemes;
CREATE POLICY "auth_update_gov_schemes" ON gov_schemes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_gov_schemes" ON gov_schemes;
CREATE POLICY "auth_delete_gov_schemes" ON gov_schemes FOR DELETE
  TO authenticated USING (true);

INSERT INTO gov_schemes (name, ministry, category, eligibility, benefits, official_url, is_free, verified)
VALUES
  ('PM-KISAN','Ministry of Agriculture','Agriculture','Small and marginal landholding farmer families with cultivable land up to 2 hectares','Income support of Rs 6,000 per year in three instalments paid directly to bank accounts','https://pmkisan.gov.in',true,true),
  ('Pradhan Mantri MUDRA Yojana','Ministry of Finance','Finance','Individuals and micro enterprises engaged in manufacturing, trading or services needing loans up to Rs 10 lakh','Collateral-free micro loans up to Rs 10 lakh under Shishu, Kishore and Tarun categories','https://www.mudra.org.in',true,true),
  ('Pradhan Mantri Kaushal Vikas Yojana (PMKVY)','Ministry of Skill Development','Skill','Indian nationals aged 15-45 seeking short-term skill training in industry-relevant trades','Free short-term skill training, certification and placement support','https://www.pmkvyofficial.org',true,true),
  ('Mahatma Gandhi National Rural Employment Guarantee (MGNREGA)','Ministry of Rural Development','Employment','Adult members of rural households willing to do unskilled manual work','Guaranteed 100 days of wage employment per year per rural household','https://nrega.nic.in',true,true),
  ('Pradhan Mantri Employment Generation Programme (PMEGP)','Ministry of MSME','Employment','Individuals above 18 and registered micro enterprises setting up new projects costing up to Rs 50 lakh (manufacturing) or Rs 20 lakh (services)','Margin money subsidy of up to 35% of project cost to set up micro enterprises','https://www.kviconline.gov.in/pmegp',true,true),
  ('Pradhan Mantri Awas Yojana - Gramin','Ministry of Rural Development','Welfare','Houseless households and those living in kutcha/dilapidated houses in rural areas without pucca shelter','Financial assistance of Rs 1.2-1.3 lakh for construction of a pucca house','https://pmayg.nic.in',true,true),
  ('Pradhan Mantri Awas Yojana - Urban','Ministry of Housing and Urban Affairs','Welfare','Economically weaker and low-income groups in urban areas without pucca housing','Interest subsidy on home loans and affordable housing assistance','https://pmaymis.gov.in',true,true),
  ('Ayushman Bharat - PMJAY','Ministry of Health and Family Welfare','Welfare','Families listed in SECC 2011 database with eligible socio-economic criteria','Health cover of Rs 5 lakh per family per year for secondary and tertiary care, cashless at empanelled hospitals','https://pmjay.gov.in',true,true),
  ('Pradhan Mantri Suraksha Bima Yojana','Ministry of Finance','Finance','Indian bank account holders aged 18-70 with auto-debit enabled savings account','Accidental death and disability cover of Rs 2 lakh for a premium of Rs 20 per year','https://www.jansuraksha.gov.in',true,true),
  ('Pradhan Mantri Jeevan Jyoti Bima Yojana','Ministry of Finance','Finance','Indian bank account holders aged 18-50 with auto-debit enabled savings account','Life insurance cover of Rs 2 lakh for a premium of Rs 436 per year','https://www.jansuraksha.gov.in',true,true),
  ('Atal Pension Yojana','Ministry of Finance','Finance','Indian citizens aged 18-40 with a savings bank account','Guaranteed pension from Rs 1,000 to Rs 5,000 per month starting at age 60, co-funded by Government','https://www.npscra.nsdl.co.in/scheme-details.php',true,true),
  ('Stand-Up India','Ministry of Finance','Finance','SC, ST and women entrepreneurs setting up greenfield enterprises in manufacturing, services or trading','Bank loans between Rs 10 lakh and Rs 1 crore for setting up new enterprises','https://www.standupmitra.in',true,true),
  ('National Career Service (NCS)','Ministry of Labour and Employment','Employment','Job seekers, employers and training providers across India','Free online job matching, career counselling and registration with employment exchanges','https://www.ncs.gov.in',true,true),
  ('Pradhan Mantri Gramin Sadak Yojana (PMGSY)','Ministry of Rural Development','Welfare','Rural populations in habitations currently unconnected by all-weather roads','All-weather road connectivity to eligible unconnected rural habitations','https://omms.nic.in',true,true),
  ('Pradhan Mantri Ujjwala Yojana','Ministry of Petroleum and Natural Gas','Welfare','Adult women from BPL households without LPG connection','Free LPG connection with financial support for the cylinder and pressure regulator','https://www.pmuy.gov.in',true,true),
  ('Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY)','Ministry of Rural Development','Skill','Rural youth from poor families aged 15-35 seeking employment-linked skill training','Free residential skill training with mandatory placement support post-certification','https://www.ddugky.gov.in',true,true),
  ('Pradhan Mantri Fasal Bima Yojana','Ministry of Agriculture','Agriculture','All farmers growing notified crops in notified areas, loanee farmers mandatory, others voluntary','Crop insurance against natural calamities, pests and diseases with subsidised premium rates','https://pmfby.gov.in',true,true),
  ('Sukanya Samriddhi Yojana','Ministry of Finance','Finance','Guardians of girl children below 10 years of age','Small savings scheme with high interest rate and tax benefits for girl child education and marriage','https://www.india.gov.in/sukanya-samriddhi-yojana',true,true)
ON CONFLICT DO NOTHING;
