# Proverb data review

## Blank placement audit — 2026-10-17

Checked all 870 source records for complete prompt/answer reconstruction, valid
answer starts, and repeated space-separated words crossing the blank boundary.
The reported **သူခိုးက လူ လူ ဟစ်** was the only existing split that exposed half
of a repeated expression. It now displays **သူခိုးက ______ ဟစ်**, with **လူ လူ**
as the answer, preserving the source wording. Both input and choice modes use
this answer. The prompt now asks to fill the blank instead of the remaining half.

Automatic splitting also keeps repeated space-separated words together for future
entries. These structural checks do not certify every source spelling or every
phrase boundary as a linguistic review.

Compared the existing dataset with the user-supplied proverb list on 2026-10-16. Corrected the clear transcription errors below; retained existing meanings and stable IDs. The pasted list contains variants and apparent typos of its own, so unmatched wording was not automatically treated as an error. No new meanings were invented.

| Before | After |
| --- | --- |
| ကံဆိုးမှသွားရာမိုးလိုက်လို့ရွာ | ကံဆိုးမသွားရာ မိုးလိုက်လို့ရွာ |
| ကောက်သော် မစားလောက် ဖြောင့်သော် စားမနိုင် | ကောက်သော် စားမလောက် ဖြောင့်သော် စားမနိုင် |
| ကိုယ်ထင် ခုတင်ရွှေနန်း | ကိုယ်ထင် ကုတင်ရွှေနန်း |
| ကိုယ့်ကို ကိုယ်ဖော် မသူတော် ခုနစ်ပါး | ကိုယ့်ဂုဏ်ကိုယ်ဖော် မသူတော်ခုနစ်ပါး |
| ခရု ခါးတောင်းကျိုုက်ဖမ်း | ခရုခါးတောင်းကျိုက်ဖမ်း |
| ချည်ပုဆိုးက ပိုးပေါင်ချင် | ချည်ပုဆိုးက ပိုးပေါင်းချင် |
| ထမင်းရည်ပူ လာ လျှာလွှဲ | ထမင်းရည်ပူ လျှာလွှဲ |
| "ဝမရှိဘဲ ဝိလုပ်           " | ဝ မရှိဘဲ ဝိ မလုပ်နဲ့ |
| သခင်အားရ ကျွန်တန်ဝ | သခင်အားရ ကျွန်ပါးဝ |
| သူ့ဆန်စား ရဲမှ | သူ့ဆန်စား ရဲရ |

Removed the exactly duplicated explanation for **ကိုယ့်ဂုဏ်ကိုယ်ဖော် မသူတော်ခုနစ်ပါး**. All 870 source records remain.

Examples retained as variants rather than automatically replaced: **နတ်ကရာ ကျီးမော** (its explanation explicitly lists ကျီးမော့ as another form), **မသိသူ ကျော်သွား၊ သိသူ ဖော်စား** (ကျော်သွား matches its existing explanation), and **အမှိုက်ကစ ပြာသာဒ်မီးလောင်** (the pasted list spells ပြာသာဒ် differently).

Added the user-requested credit to proverb setup and completed-round results:

မြန်မာစကားပုံများကို ဆရာ ဒေါက်တာ ၀င်းသိန်း Website မှ ယူသုံးထားတာဖြစ်ပါတယ်

No source hyperlink was added because the website URL was not supplied.
