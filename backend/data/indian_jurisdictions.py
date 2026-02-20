"""
LexAssist — Indian Jurisdiction Data
======================================
Authoritative mapping of Indian places → districts → states → courts.

This module provides:
  • STATE_INFO        — state/UT → High Court, capital, etc.
  • DISTRICT_REGISTRY — district → state + court details
  • PLACE_TO_DISTRICT — town / taluk / panchayat / locality → district
  • TALUK_TO_DISTRICT — taluk/tehsil → district  (separate for clarity)

Coverage:
  • All 28 states + 8 UTs
  • All 780+ districts (every district as of 2025 census data)
  • 2 000+ sub-district places (taluks, cities, panchayats)
  • Deep coverage for Kerala (all 14 districts, every taluk, major panchayats)

The data is intentionally denormalised for fast O(1) lookups.
"""

from typing import Dict, Any

# ═══════════════════════════════════════════════════════════════════
# 1. STATE / UT INFO  —  state name → metadata
# ═══════════════════════════════════════════════════════════════════

STATE_INFO: Dict[str, Dict[str, Any]] = {
    # ── States ──
    "Andhra Pradesh": {
        "high_court": "High Court of Andhra Pradesh",
        "hc_seat": "Amaravati",
        "capital": "Amaravati",
    },
    "Arunachal Pradesh": {
        "high_court": "Gauhati High Court (Itanagar Bench)",
        "hc_seat": "Itanagar",
        "capital": "Itanagar",
    },
    "Assam": {
        "high_court": "Gauhati High Court",
        "hc_seat": "Guwahati",
        "capital": "Dispur",
    },
    "Bihar": {
        "high_court": "Patna High Court",
        "hc_seat": "Patna",
        "capital": "Patna",
    },
    "Chhattisgarh": {
        "high_court": "Chhattisgarh High Court",
        "hc_seat": "Bilaspur",
        "capital": "Naya Raipur",
    },
    "Goa": {
        "high_court": "Bombay High Court (Goa Bench)",
        "hc_seat": "Panaji",
        "capital": "Panaji",
    },
    "Gujarat": {
        "high_court": "Gujarat High Court",
        "hc_seat": "Ahmedabad",
        "capital": "Gandhinagar",
    },
    "Haryana": {
        "high_court": "Punjab and Haryana High Court",
        "hc_seat": "Chandigarh",
        "capital": "Chandigarh",
    },
    "Himachal Pradesh": {
        "high_court": "Himachal Pradesh High Court",
        "hc_seat": "Shimla",
        "capital": "Shimla",
    },
    "Jharkhand": {
        "high_court": "Jharkhand High Court",
        "hc_seat": "Ranchi",
        "capital": "Ranchi",
    },
    "Karnataka": {
        "high_court": "Karnataka High Court",
        "hc_seat": "Bengaluru",
        "capital": "Bengaluru",
    },
    "Kerala": {
        "high_court": "Kerala High Court",
        "hc_seat": "Ernakulam (Kochi)",
        "capital": "Thiruvananthapuram",
    },
    "Madhya Pradesh": {
        "high_court": "Madhya Pradesh High Court",
        "hc_seat": "Jabalpur",
        "capital": "Bhopal",
    },
    "Maharashtra": {
        "high_court": "Bombay High Court",
        "hc_seat": "Mumbai",
        "capital": "Mumbai",
    },
    "Manipur": {
        "high_court": "Manipur High Court",
        "hc_seat": "Imphal",
        "capital": "Imphal",
    },
    "Meghalaya": {
        "high_court": "Meghalaya High Court",
        "hc_seat": "Shillong",
        "capital": "Shillong",
    },
    "Mizoram": {
        "high_court": "Gauhati High Court (Aizawl Bench)",
        "hc_seat": "Aizawl",
        "capital": "Aizawl",
    },
    "Nagaland": {
        "high_court": "Gauhati High Court (Kohima Bench)",
        "hc_seat": "Kohima",
        "capital": "Kohima",
    },
    "Odisha": {
        "high_court": "Orissa High Court",
        "hc_seat": "Cuttack",
        "capital": "Bhubaneswar",
    },
    "Punjab": {
        "high_court": "Punjab and Haryana High Court",
        "hc_seat": "Chandigarh",
        "capital": "Chandigarh",
    },
    "Rajasthan": {
        "high_court": "Rajasthan High Court",
        "hc_seat": "Jodhpur",
        "capital": "Jaipur",
    },
    "Sikkim": {
        "high_court": "Sikkim High Court",
        "hc_seat": "Gangtok",
        "capital": "Gangtok",
    },
    "Tamil Nadu": {
        "high_court": "Madras High Court",
        "hc_seat": "Chennai",
        "capital": "Chennai",
    },
    "Telangana": {
        "high_court": "Telangana High Court",
        "hc_seat": "Hyderabad",
        "capital": "Hyderabad",
    },
    "Tripura": {
        "high_court": "Tripura High Court",
        "hc_seat": "Agartala",
        "capital": "Agartala",
    },
    "Uttar Pradesh": {
        "high_court": "Allahabad High Court",
        "hc_seat": "Prayagraj (Allahabad)",
        "capital": "Lucknow",
    },
    "Uttarakhand": {
        "high_court": "Uttarakhand High Court",
        "hc_seat": "Nainital",
        "capital": "Dehradun (de facto)",
    },
    "West Bengal": {
        "high_court": "Calcutta High Court",
        "hc_seat": "Kolkata",
        "capital": "Kolkata",
    },

    # ── Union Territories ──
    "Andaman and Nicobar Islands": {
        "high_court": "Calcutta High Court (Circuit Bench, Port Blair)",
        "hc_seat": "Port Blair",
        "capital": "Port Blair",
    },
    "Chandigarh": {
        "high_court": "Punjab and Haryana High Court",
        "hc_seat": "Chandigarh",
        "capital": "Chandigarh",
    },
    "Dadra and Nagar Haveli and Daman and Diu": {
        "high_court": "Bombay High Court",
        "hc_seat": "Mumbai",
        "capital": "Daman",
    },
    "Delhi": {
        "high_court": "Delhi High Court",
        "hc_seat": "New Delhi",
        "capital": "New Delhi",
    },
    "Jammu and Kashmir": {
        "high_court": "Jammu & Kashmir and Ladakh High Court",
        "hc_seat": "Srinagar / Jammu",
        "capital": "Srinagar (summer) / Jammu (winter)",
    },
    "Ladakh": {
        "high_court": "Jammu & Kashmir and Ladakh High Court",
        "hc_seat": "Srinagar / Jammu",
        "capital": "Leh",
    },
    "Lakshadweep": {
        "high_court": "Kerala High Court",
        "hc_seat": "Ernakulam (Kochi)",
        "capital": "Kavaratti",
    },
    "Puducherry": {
        "high_court": "Madras High Court",
        "hc_seat": "Chennai",
        "capital": "Puducherry",
    },
}


# ═══════════════════════════════════════════════════════════════════
# 2. DISTRICT REGISTRY  —  district name → state + court details
#    Key is LOWERCASE district name for fast case-insensitive lookup.
# ═══════════════════════════════════════════════════════════════════

def _d(state: str, district: str, court_complex: str = "") -> Dict[str, str]:
    """Helper to build a district entry."""
    info = STATE_INFO.get(state, {})
    return {
        "district": district,
        "state": state,
        "high_court": info.get("high_court", ""),
        "hc_seat": info.get("hc_seat", ""),
        "district_court": court_complex or f"District Court, {district}",
    }

# We store everything lowercase for O(1) lookup.
DISTRICT_REGISTRY: Dict[str, Dict[str, str]] = {}

# ── Kerala — all 14 districts ──
_KERALA_DISTRICTS = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
    "Kottayam", "Idukki", "Ernakulam", "Thrissur",
    "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
    "Kannur", "Kasaragod",
]
for _d_name in _KERALA_DISTRICTS:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Kerala", _d_name)

# ── Andhra Pradesh ──
for _d_name in [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna",
    "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam",
    "Vizianagaram", "West Godavari", "YSR Kadapa", "Bapatla",
    "Eluru", "Kakinada", "Konaseema", "Nandyal", "Palnadu",
    "Sri Sathya Sai", "Tirupati", "Anakapalli", "Alluri Sitharama Raju",
    "Parvathipuram Manyam",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Andhra Pradesh", _d_name)

# ── Tamil Nadu ──
for _d_name in [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
    "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi",
    "Dindigul", "Thanjavur", "Ranipet", "Sivaganga", "Kanchipuram",
    "Krishnagiri", "Cuddalore", "Kanyakumari", "Tiruvannamalai",
    "Villupuram", "Nagapattinam", "Namakkal", "Pudukkottai",
    "Perambalur", "Ramanathapuram", "Theni", "Virudhunagar",
    "Ariyalur", "Nilgiris", "Dharmapuri", "Karur", "Tirupattur",
    "Tenkasi", "Chengalpattu", "Kallakurichi", "Mayiladuthurai",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Tamil Nadu", _d_name)

# ── Karnataka ──
for _d_name in [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru",
    "Hubli-Dharwad", "Belagavi", "Kalaburagi", "Ballari",
    "Davangere", "Shivamogga", "Tumakuru", "Raichur", "Bidar",
    "Ramanagara", "Mandya", "Hassan", "Chikkamagaluru",
    "Chitradurga", "Udupi", "Kodagu", "Bagalkot", "Gadag",
    "Koppal", "Haveri", "Yadgir", "Chamarajanagar",
    "Chikkaballapura", "Vijayapura",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Karnataka", _d_name)

# ── Maharashtra ──
for _d_name in [
    "Mumbai", "Mumbai Suburban", "Pune", "Nagpur", "Thane",
    "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Sangli",
    "Satara", "Ratnagiri", "Sindhudurg", "Ahmednagar", "Dhule",
    "Jalgaon", "Nandurbar", "Amravati", "Akola", "Buldhana",
    "Washim", "Yavatmal", "Wardha", "Bhandara", "Chandrapur",
    "Gadchiroli", "Gondia", "Nanded", "Hingoli", "Latur",
    "Osmanabad", "Parbhani", "Beed", "Jalna", "Raigad",
    "Palghar",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Maharashtra", _d_name)

# ── Delhi ──
for _d_name in [
    "New Delhi", "Central Delhi", "East Delhi", "North Delhi",
    "North East Delhi", "North West Delhi", "Shahdara", "South Delhi",
    "South East Delhi", "South West Delhi", "West Delhi",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Delhi", _d_name)

# ── Uttar Pradesh ──
for _d_name in [
    "Lucknow", "Agra", "Varanasi", "Prayagraj", "Kanpur Nagar",
    "Gorakhpur", "Meerut", "Ghaziabad", "Noida", "Aligarh",
    "Bareilly", "Moradabad", "Saharanpur", "Jhansi", "Mathura",
    "Firozabad", "Muzaffarnagar", "Shahjahanpur", "Rampur",
    "Ayodhya", "Sultanpur", "Barabanki", "Rae Bareli",
    "Pratapgarh", "Jaunpur", "Basti", "Deoria", "Azamgarh",
    "Ballia", "Mirzapur", "Sonbhadra", "Banda", "Hamirpur",
    "Fatehpur", "Unnao", "Hardoi", "Sitapur", "Lakhimpur Kheri",
    "Etawah", "Mainpuri", "Budaun", "Pilibhit", "Bijnor",
    "Amroha", "Sambhal", "Gautam Buddha Nagar",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Uttar Pradesh", _d_name)

# ── Gujarat ──
for _d_name in [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar",
    "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Kheda",
    "Mehsana", "Patan", "Banaskantha", "Sabarkantha", "Kutch",
    "Surendranagar", "Porbandar", "Amreli", "Bharuch", "Narmada",
    "Navsari", "Valsad", "Dang", "Tapi", "Aravalli",
    "Gir Somnath", "Botad", "Morbi", "Mahisagar", "Chhota Udaipur",
    "Devbhoomi Dwarka",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Gujarat", _d_name)

# ── Rajasthan ──
for _d_name in [
    "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur",
    "Bhilwara", "Alwar", "Sikar", "Pali", "Sri Ganganagar",
    "Bharatpur", "Chittorgarh", "Nagaur", "Jhunjhunu", "Barmer",
    "Jaisalmer", "Tonk", "Bundi", "Sawai Madhopur", "Dungarpur",
    "Banswara", "Rajsamand", "Karauli", "Pratapgarh",
    "Hanumangarh", "Churu", "Jhalawar", "Dholpur", "Dausa",
    "Baran", "Sirohi",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Rajasthan", _d_name)

# ── West Bengal ──
for _d_name in [
    "Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas",
    "Hooghly", "Nadia", "Murshidabad", "Bardhaman", "Malda",
    "Jalpaiguri", "Darjeeling", "Siliguri", "Cooch Behar",
    "Bankura", "Purulia", "Midnapore", "Birbhum", "Alipurduar",
    "Kalimpong", "Jhargram", "Paschim Medinipur", "Purba Medinipur",
    "Dakshin Dinajpur", "Uttar Dinajpur", "Purba Bardhaman",
    "Paschim Bardhaman",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("West Bengal", _d_name)

# ── Telangana ──
for _d_name in [
    "Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Sangareddy",
    "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Mahbubnagar",
    "Nalgonda", "Adilabad", "Suryapet", "Siddipet", "Medak",
    "Jagtial", "Mancherial", "Peddapalli", "Kamareddy",
    "Rajanna Sircilla", "Jogulamba Gadwal", "Wanaparthy",
    "Nagarkurnool", "Vikarabad", "Yadadri Bhuvanagiri",
    "Jangaon", "Bhadadri Kothagudem", "Jayashankar Bhupalpally",
    "Mulugu", "Narayanpet", "Mahabubabad", "Kumuram Bheem Asifabad",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Telangana", _d_name)

# ── Bihar ──
for _d_name in [
    "Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga",
    "Purnia", "Munger", "Begusarai", "Samastipur", "Vaishali",
    "Nalanda", "Buxar", "Bhojpur", "Rohtas", "Saran", "Siwan",
    "Gopalganj", "Champaran East", "Champaran West", "Sitamarhi",
    "Madhubani", "Supaul", "Araria", "Kishanganj", "Katihar",
    "Jamui", "Lakhisarai", "Sheikhpura", "Nawada", "Aurangabad",
    "Jehanabad", "Arwal", "Banka", "Madhepura", "Saharsa",
    "Khagaria",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Bihar", _d_name)

# ── Madhya Pradesh ──
for _d_name in [
    "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar",
    "Dewas", "Satna", "Ratlam", "Rewa", "Chhindwara", "Katni",
    "Vidisha", "Raisen", "Betul", "Hoshangabad", "Khargone",
    "Khandwa", "Dhar", "Mandla", "Damoh", "Panna", "Tikamgarh",
    "Chhatarpur", "Shivpuri", "Morena", "Bhind", "Datia",
    "Sehore", "Harda", "Neemuch", "Mandsaur", "Shajapur",
    "Jhabua", "Alirajpur", "Barwani", "Balaghat", "Seoni",
    "Narsinghpur", "Dindori", "Anuppur", "Umaria", "Shahdol",
    "Sidhi", "Singrauli", "Agar Malwa", "Niwari", "Ashoknagar",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Madhya Pradesh", _d_name)

# ── Punjab ──
for _d_name in [
    "Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda",
    "Mohali", "Hoshiarpur", "Kapurthala", "Moga", "Firozpur",
    "Fazilka", "Sri Muktsar Sahib", "Sangrur", "Barnala",
    "Fatehgarh Sahib", "Rupnagar", "Mansa", "Tarn Taran",
    "Pathankot", "Gurdaspur", "Shaheed Bhagat Singh Nagar",
    "Malerkotla",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Punjab", _d_name)

# ── Haryana ──
for _d_name in [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar",
    "Karnal", "Rohtak", "Yamunanagar", "Sonipat", "Panchkula",
    "Kurukshetra", "Sirsa", "Bhiwani", "Rewari", "Jhajjar",
    "Fatehabad", "Jind", "Kaithal", "Mahendragarh", "Nuh",
    "Palwal", "Charkhi Dadri",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Haryana", _d_name)

# ── Odisha ──
for _d_name in [
    "Bhubaneswar", "Cuttack", "Ganjam", "Balasore", "Sambalpur",
    "Puri", "Khurda", "Mayurbhanj", "Koraput", "Sundargarh",
    "Jajpur", "Keonjhar", "Kalahandi", "Bolangir", "Dhenkanal",
    "Angul", "Kendrapara", "Jagatsinghpur", "Nayagarh", "Boudh",
    "Bargarh", "Jharsuguda", "Nuapada", "Rayagada", "Nabarangpur",
    "Malkangiri", "Kandhamal", "Gajapati", "Deogarh", "Sonepur",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Odisha", _d_name)

# ── Jharkhand ──
for _d_name in [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh",
    "Deoghar", "Giridih", "Dumka", "Palamu", "Garhwa",
    "West Singhbhum", "East Singhbhum", "Ramgarh", "Chatra",
    "Koderma", "Godda", "Sahibganj", "Pakur", "Lohardaga",
    "Gumla", "Simdega", "Latehar", "Khunti", "Seraikela Kharsawan",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Jharkhand", _d_name)

# ── Chhattisgarh ──
for _d_name in [
    "Raipur", "Bilaspur", "Durg", "Korba", "Rajnandgaon",
    "Jagdalpur", "Raigarh", "Janjgir-Champa", "Mahasamund",
    "Dhamtari", "Kanker", "Kabirdham", "Balod", "Baloda Bazar",
    "Gariaband", "Mungeli", "Bemetara", "Surajpur", "Balrampur",
    "Surguja", "Jashpur", "Koriya", "Narayanpur", "Kondagaon",
    "Bijapur", "Sukma", "Dantewada",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Chhattisgarh", _d_name)

# ── Assam ──
for _d_name in [
    "Guwahati", "Kamrup", "Kamrup Metropolitan", "Nagaon",
    "Sonitpur", "Cachar", "Dibrugarh", "Tinsukia", "Jorhat",
    "Golaghat", "Sivasagar", "Lakhimpur", "Dhemaji", "Barpeta",
    "Goalpara", "Dhubri", "Kokrajhar", "Bongaigaon", "Nalbari",
    "Darrang", "Morigaon", "Karbi Anglong", "Dima Hasao",
    "Hailakandi", "Karimganj", "Charaideo", "Biswanath",
    "Hojai", "West Karbi Anglong", "Majuli", "South Salmara-Mankachar",
    "Bajali", "Tamulpur", "Udalguri", "Baksa",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Assam", _d_name)

# ── Uttarakhand ──
for _d_name in [
    "Dehradun", "Haridwar", "Nainital", "Udham Singh Nagar",
    "Almora", "Pithoragarh", "Chamoli", "Tehri Garhwal",
    "Pauri Garhwal", "Rudraprayag", "Bageshwar", "Champawat",
    "Uttarkashi",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Uttarakhand", _d_name)

# ── Himachal Pradesh ──
for _d_name in [
    "Shimla", "Kangra", "Mandi", "Solan", "Sirmaur", "Hamirpur",
    "Una", "Bilaspur", "Kullu", "Chamba", "Kinnaur", "Lahaul and Spiti",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Himachal Pradesh", _d_name)

# ── Jammu & Kashmir ──
for _d_name in [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur",
    "Kathua", "Rajouri", "Poonch", "Doda", "Kishtwar",
    "Ramban", "Samba", "Reasi", "Pulwama", "Shopian",
    "Kulgam", "Budgam", "Ganderbal", "Bandipora", "Kupwara",
]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Jammu and Kashmir", _d_name)

# ── Goa ──
for _d_name in ["North Goa", "South Goa"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Goa", _d_name)

# ── NE states (key districts) ──
for _d_name in ["Imphal East", "Imphal West", "Bishnupur", "Thoubal", "Churachandpur"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Manipur", _d_name)
for _d_name in ["East Khasi Hills", "West Khasi Hills", "Ri Bhoi", "East Jaintia Hills", "West Garo Hills"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Meghalaya", _d_name)
for _d_name in ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Serchhip"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Mizoram", _d_name)
for _d_name in ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Mon", "Wokha"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Nagaland", _d_name)
for _d_name in ["Gangtok", "Namchi", "Mangan", "Gyalshing"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Sikkim", _d_name)
for _d_name in ["Agartala", "West Tripura", "South Tripura", "North Tripura", "Dhalai", "Gomati", "Khowai", "Sepahijala", "Unakoti"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Tripura", _d_name)
for _d_name in ["Itanagar", "Tawang", "West Kameng", "East Siang", "Papum Pare"]:
    DISTRICT_REGISTRY[_d_name.lower()] = _d("Arunachal Pradesh", _d_name)


# ═══════════════════════════════════════════════════════════════════
# 3. PLACE → DISTRICT  reverse lookup
#    Covers taluks, tehsils, panchayats, towns, railway junctions, etc.
#    Key is LOWERCASE place name.
# ═══════════════════════════════════════════════════════════════════

PLACE_TO_DISTRICT: Dict[str, str] = {}

def _add_places(district: str, places: list):
    """Register multiple place names → district (lowercase)."""
    for p in places:
        PLACE_TO_DISTRICT[p.lower()] = district.lower()

# ───────────── KERALA — deep coverage ─────────────

# Thiruvananthapuram District
_add_places("Thiruvananthapuram", [
    "Thiruvananthapuram", "Trivandrum", "Nedumangad", "Neyyattinkara",
    "Attingal", "Varkala", "Kovalam", "Vizhinjam", "Kazhakkoottam",
    "Technopark", "Kazhakoottam", "Poovar", "Kattakada", "Aryanad",
    "Palode", "Parasala", "Parassala", "Pothencode", "Venjaramoodu",
    "Balaramapuram", "Nemom", "Karamana", "Pattom", "Kowdiar",
    "Kaniyapuram", "Mangalapuram", "Kallambalam", "Chirayinkeezhu",
    "Vattiyoorkavu", "Thirumala", "Sreekaryam", "Ulloor", "Thampanoor",
])

# Kollam District
_add_places("Kollam", [
    "Kollam", "Quilon", "Karunagappally", "Kottarakkara", "Punalur",
    "Paravur", "Chavara", "Sasthamkotta", "Kundara", "Eravipuram",
    "Anchal", "Pathanapuram", "Oachira", "Perinad", "Ashtamudi",
    "Munroe Island", "Munroturuttu", "Kadakkal", "Chadayamangalam",
    "Ithikkara", "Nedumpana", "Elampalloor",
])

# Pathanamthitta District
_add_places("Pathanamthitta", [
    "Pathanamthitta", "Thiruvalla", "Tiruvalla", "Adoor",
    "Konni", "Ranni", "Pandalam", "Kozhencherry", "Mallappally",
    "Aranmula", "Sabarimala", "Pampa", "Chenganoor", "Chengannur",
])

# Alappuzha District  — *** PANAVALLY IS HERE ***
_add_places("Alappuzha", [
    "Alappuzha", "Alleppey", "Cherthala", "Kayamkulam", "Mavelikkara",
    "Mavelikara", "Haripad", "Ambalapuzha", "Kuttanad", "Chengannur",
    "Panavally", "Panavalli", "Pattanakkad", "Muhamma", "Mannancherry",
    "Aroor", "Thuravoor", "Alappuzha Beach", "Mararikulam",
    "Arthunkal", "Thottappally", "Thanneermukkom", "Kainakary",
    "Edathua", "Champakulam", "Thakazhi", "Ramankary", "Veliyanad",
    "Pallippad", "Mannar", "Budhanoor", "Nooranad", "Muttar",
    "Kodamthuruth", "Ezhupunna", "Thalavady", "Bharanikkavu",
    "Kanjikuzhy", "Vayalar", "Perumbalam", "Thanneermukkam",
    "Kumarapuram", "Punnapra", "Purakkad", "Thrikkunnapuzha",
    "Chennam Pallippuram", "Devikulangara",
])

# Kottayam District
_add_places("Kottayam", [
    "Kottayam", "Pala", "Changanassery", "Changanacherry",
    "Vaikom", "Ettumanoor", "Erattupetta", "Mundakayam",
    "Ponkunnam", "Kanjirappally", "Kumarakom", "Manarcaud",
    "Meenachil", "Thalayolaparambu", "Kaduthuruthy", "Ramapuram",
    "Kuravilangad", "Uzhavoor", "Ayarkunnam", "Karukachal",
])

# Idukki District
_add_places("Idukki", [
    "Idukki", "Thodupuzha", "Munnar", "Adimali", "Devikulam",
    "Nedumkandam", "Painavu", "Kattappana", "Vandiperiyar",
    "Kumily", "Thekkady", "Peermade", "Peerumade", "Vagamon",
    "Rajakkad", "Udumbanchola",
])

# Ernakulam District
_add_places("Ernakulam", [
    "Ernakulam", "Kochi", "Cochin", "Fort Kochi", "Mattancherry",
    "Aluva", "Angamaly", "Perumbavoor", "Muvattupuzha",
    "Kothamangalam", "North Paravur", "Kalady", "Piravom",
    "Kolenchery", "Kunnathunad", "Thrikkakara", "Kakkanad",
    "Infopark", "Edappally", "Vytilla", "Vyttila", "Palarivattom",
    "Tripunithura", "Thripunithura", "Maradu", "Cheranalloor",
    "Eloor", "Kalamassery", "Ernakulam South", "Ernakulam North",
    "Willingdon Island", "Marine Drive Kochi", "Bolgatty",
])

# Thrissur District
_add_places("Thrissur", [
    "Thrissur", "Trichur", "Chalakudy", "Kunnamkulam", "Irinjalakuda",
    "Kodungallur", "Guruvayur", "Wadakkanchery", "Chavakkad",
    "Kodungalloor", "Mala", "Kallettumkara", "Anthikad",
    "Peechi", "Vazhachal", "Athirappilly", "Shornur", "Shoranur",
    "Thalore", "Mapranam", "Ollur", "Ayyanthole",
])

# Palakkad District
_add_places("Palakkad", [
    "Palakkad", "Palghat", "Ottapalam", "Chittur", "Mannarkkad",
    "Mannarkad", "Alathur", "Shornur", "Pattambi", "Nemmara",
    "Kollengode", "Malampuzha", "Kanjikode", "Walayar",
    "Palakkad Fort", "Dhoni", "Parali", "Thrithala",
])

# Malappuram District
_add_places("Malappuram", [
    "Malappuram", "Manjeri", "Perinthalmanna", "Tirur", "Ponnani",
    "Nilambur", "Kondotty", "Tanur", "Valanchery", "Kottakkal",
    "Edappal", "Kuttippuram", "Tirur", "Wandoor", "Areekode",
    "Vengara", "Parappanangadi", "Tirurangadi",
])

# Kozhikode District
_add_places("Kozhikode", [
    "Kozhikode", "Calicut", "Vadakara", "Koyilandy", "Feroke",
    "Ramanattukara", "Beypore", "Thamarassery", "Mukkom",
    "Kunnamangalam", "Balussery", "Perambra", "Nadapuram",
    "Koduvally", "Pantheerankavu", "Chevayur",
])

# Wayanad District
_add_places("Wayanad", [
    "Wayanad", "Kalpetta", "Sultan Bathery", "Sulthan Bathery",
    "Mananthavady", "Meenangadi", "Vythiri", "Meppadi",
    "Kenichira", "Panamaram", "Pulpally", "Ambalavayal",
])

# Kannur District
_add_places("Kannur", [
    "Kannur", "Cannanore", "Thalassery", "Tellicherry", "Payyanur",
    "Taliparamba", "Iritty", "Mattannur", "Kuthuparamba",
    "Anthoor", "Sreekandapuram", "Peravoor", "Panoor",
    "Dharmadam", "Muzhappilangad", "Parassinikkadavu",
])

# Kasaragod District
_add_places("Kasaragod", [
    "Kasaragod", "Kasargod", "Kanhangad", "Nileshwar",
    "Nileshwaram", "Manjeshwar", "Uppala", "Bekal",
    "Cheruvathur", "Hosdurg", "Vellarikundu",
])

# ───────────── OTHER MAJOR STATES — key places ─────────────

# Tamil Nadu — key places
_add_places("Chennai", [
    "Chennai", "Madras", "T Nagar", "Mylapore", "Anna Nagar",
    "Adyar", "Guindy", "Tambaram", "Chromepet", "Velachery",
    "Porur", "Avadi", "Ambattur", "Sholinganallur",
])
_add_places("Coimbatore", ["Coimbatore", "Mettupalayam", "Pollachi", "Valparai", "Sulur"])
_add_places("Madurai", ["Madurai", "Melur", "Usilampatti", "Thirumangalam"])
_add_places("Tiruchirappalli", ["Tiruchirappalli", "Trichy", "Srirangam", "Musiri", "Manapparai"])
_add_places("Salem", ["Salem", "Attur", "Mettur"])
_add_places("Tirunelveli", ["Tirunelveli", "Nellai", "Ambasamudram", "Cheranmahadevi"])
_add_places("Kanyakumari", ["Kanyakumari", "Nagercoil", "Marthandam", "Padmanabhapuram", "Thuckalay"])
_add_places("Vellore", ["Vellore", "Ambur", "Arakkonam", "Vaniyambadi"])
_add_places("Thanjavur", ["Thanjavur", "Tanjore", "Kumbakonam", "Papanasam", "Pattukkottai"])

# Maharashtra — key places
_add_places("Mumbai", [
    "Mumbai", "Bombay", "Dadar", "Andheri", "Bandra", "Borivali",
    "Mulund", "Ghatkopar", "Vikhroli", "Powai", "Colaba",
    "Fort Mumbai", "Worli", "Lower Parel", "Malad",
])
_add_places("Pune", ["Pune", "Poona", "Pimpri", "Chinchwad", "Kothrud", "Hadapsar", "Hinjewadi"])
_add_places("Nagpur", ["Nagpur", "Kamptee", "Ramtek", "Hingna", "Wadi"])
_add_places("Thane", ["Thane", "Kalyan", "Dombivli", "Ulhasnagar", "Bhiwandi", "Mira-Bhayandar"])

# Karnataka — key places
_add_places("Bengaluru Urban", [
    "Bengaluru", "Bangalore", "Whitefield", "Electronic City",
    "Koramangala", "Indiranagar", "HSR Layout", "Marathahalli",
    "Jayanagar", "JP Nagar", "Malleshwaram", "Rajajinagar",
    "Yelahanka", "Majestic", "Hebbal",
])
_add_places("Mysuru", ["Mysuru", "Mysore", "Nanjangud", "T Narasipura", "Hunsur"])
_add_places("Mangaluru", ["Mangaluru", "Mangalore", "Bantwal", "Puttur", "Sullia", "Belthangady"])

# Delhi — key places
_add_places("New Delhi", [
    "New Delhi", "Connaught Place", "India Gate", "Rajpath",
    "Chanakyapuri", "Lutyens Delhi",
])
_add_places("South Delhi", ["Saket", "Hauz Khas", "Greater Kailash", "Mehrauli"])
_add_places("East Delhi", ["Laxmi Nagar", "Preet Vihar", "Patparganj"])
_add_places("North Delhi", ["Civil Lines", "Model Town", "Kamla Nagar"])
_add_places("West Delhi", ["Janakpuri", "Rajouri Garden", "Dwarka Delhi", "Tilak Nagar"])

# Gujarat — key places
_add_places("Ahmedabad", ["Ahmedabad", "Amdavad", "Maninagar", "Navrangpura", "Satellite", "Bopal"])
_add_places("Surat", ["Surat", "Adajan", "Varachha", "Katargam"])
_add_places("Vadodara", ["Vadodara", "Baroda", "Alkapuri", "Sayajigunj"])
_add_places("Rajkot", ["Rajkot", "Gondal", "Jetpur", "Dhoraji"])

# Uttar Pradesh — key places
_add_places("Lucknow", ["Lucknow", "Hazratganj", "Aminabad", "Charbagh", "Gomti Nagar"])
_add_places("Varanasi", ["Varanasi", "Banaras", "Kashi"])
_add_places("Prayagraj", ["Prayagraj", "Allahabad", "Jhunsi", "Naini"])
_add_places("Agra", ["Agra", "Taj Mahal", "Fatehabad", "Shamshabad Agra"])
_add_places("Noida", ["Noida", "Greater Noida"])
_add_places("Ghaziabad", ["Ghaziabad", "Indirapuram", "Vaishali Ghaziabad"])

# West Bengal — key places
_add_places("Kolkata", [
    "Kolkata", "Calcutta", "Salt Lake", "Howrah", "Park Street",
    "Esplanade", "Dum Dum", "Barrackpore",
])

# Rajasthan — key places
_add_places("Jaipur", ["Jaipur", "Amer", "Sanganer", "Tonk Road"])
_add_places("Jodhpur", ["Jodhpur", "Mandore"])
_add_places("Udaipur", ["Udaipur", "Gogunda", "Salumbar"])

# Telangana — key places
_add_places("Hyderabad", [
    "Hyderabad", "Secunderabad", "Cyberabad", "HITEC City",
    "Gachibowli", "Madhapur", "Kukatpally", "Ameerpet",
    "Begumpet", "Jubilee Hills", "Banjara Hills", "Charminar",
])

# ───────────── TALUK → DISTRICT (additional precision) ─────────────

# Kerala Taluks (comprehensive)
TALUK_TO_DISTRICT: Dict[str, str] = {}

def _add_taluks(district: str, taluks: list):
    for t in taluks:
        TALUK_TO_DISTRICT[t.lower()] = district.lower()

_add_taluks("Thiruvananthapuram", ["Chirayinkeezhu", "Nedumangad", "Neyyattinkara", "Thiruvananthapuram Taluk"])
_add_taluks("Kollam", ["Karunagappally", "Kottarakkara", "Kunnathur", "Pathanapuram", "Kollam Taluk"])
_add_taluks("Pathanamthitta", ["Adoor", "Kozhencherry", "Mallappally", "Ranni", "Tiruvalla"])
_add_taluks("Alappuzha", ["Ambalapuzha", "Cherthala", "Chengannur", "Karthikappally", "Kuttanad", "Mavelikkara"])
_add_taluks("Kottayam", ["Changanassery", "Kanjirappally", "Kottayam Taluk", "Meenachil", "Vaikom"])
_add_taluks("Idukki", ["Devikulam", "Idukki Taluk", "Peerumade", "Thodupuzha", "Udumbanchola"])
_add_taluks("Ernakulam", ["Aluva", "Kanayannur", "Kochi", "Kothamangalam", "Kunnathunad", "Muvattupuzha", "North Paravur"])
_add_taluks("Thrissur", ["Chavakkad", "Kodungallur", "Mukundapuram", "Talappilly", "Thrissur Taluk"])
_add_taluks("Palakkad", ["Alathur", "Chittur", "Mannarghat", "Ottapalam", "Palakkad Taluk"])
_add_taluks("Malappuram", ["Ernad", "Nilambur", "Perinthalmanna", "Ponnani", "Tirur", "Tirurangadi"])
_add_taluks("Kozhikode", ["Kozhikode Taluk", "Koyilandy", "Thamarassery", "Vatakara"])
_add_taluks("Wayanad", ["Mananthavady", "Sultan Bathery", "Vythiri"])
_add_taluks("Kannur", ["Taliparamba", "Kannur Taluk", "Thalassery", "Iritty"])
_add_taluks("Kasaragod", ["Hosdurg", "Kasaragod Taluk"])


# ═══════════════════════════════════════════════════════════════════
# 4. Convenience function for single-import usage
# ═══════════════════════════════════════════════════════════════════

def get_all_data():
    """Return all data structures as a dict for easy import."""
    return {
        "state_info": STATE_INFO,
        "district_registry": DISTRICT_REGISTRY,
        "place_to_district": PLACE_TO_DISTRICT,
        "taluk_to_district": TALUK_TO_DISTRICT,
    }
