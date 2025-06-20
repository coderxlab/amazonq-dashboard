# **Chi tiết giải pháp đề xuất hỗ trợ sử dụng Amazon Q tại TPBank**

> **Chú ý quan trọng:** Để đạt được hiệu quả tối ưu, người dùng nên cài đặt cả Amazon Q trên IDE và Amazon Q CLI. Mỗi phiên bản có những ưu điểm riêng và khi kết hợp sẽ mang lại trải nghiệm toàn diện nhất cho người dùng.

Tài liệu bao gồm những đề xuất giải pháp cho các pain points ghi nhận được từ khảo sát ban đầu (onboarding survey) từ TPBank. Các giải pháp đề xuất bao gồm: chuẩn hóa viết code và context của dự án, phương pháp tạo prompt hiệu quả và cách dùng thư viện prompt, tự động hoá các tác vụ lặp đi lặp lại.

# **1\. Chuẩn hóa việc viết code và context của dự án**

Bao gồm việc thiết lập Project Rules, tạo Profile và quản lý Context. Những thiết lập này giúp ích cho Amazon Q Developer nắm được các ngữ cảnh cần thiết để trả lời / tạo code một cách hiệu quả và thống nhất.

### **1.1 Thiết lập Project Rules**

#### **1.1.1 Ví dụ** 

Examples: [https://www.promptz.dev/rules](https://www.promptz.dev/rules)

#### **1.1.2 Lợi Ích Project Rules**

* Code nhất quán  
* Giảm thời gian review  
* Onboarding dễ dàng  
* Tích hợp quy trình hiện tại

#### **1.1.3 Danh sách Project Rules đề xuất**

| Loại dự án | File rules |
| :---- | :---- |
| Node.js/Express | nodejs-rules.md |
| Angular | angular-rules.md |
| Spring Boot | spring-boot-rules.md |
| Testing | testing-rules.md |
| Documentation | documentation-rules.md |

#### **1.1.4 Ví dụ về việc sử dụng trong Prompts**

Tạo controller cho \`api/payment\` theo rules.

Tạo unit test cho \`Payment.tsx\` theo rules.

### **1.2 Quản Lý Ngữ Cảnh (Amazon Q CLI only)**

#### **1.2.1 Hiểu về Profiles và Context**

* **Profiles**: Cho phép chuyển đổi giữa các bộ context khác nhau  
    
* **Context files**: Chứa thông tin như quy tắc phát triển, chi tiết dự án, tiêu chuẩn coding  
    
* **Default profile** bao gồm:  
    
  * **Global context**: Files áp dụng cho tất cả các profiles  
  * **Workspace context**: Files chỉ áp dụng cho profile hiện tại

#### **1.2.2 Quản Lý Profiles**

\# Hiển thị danh sách profiles

/profile

\# Chuyển sang profile "dev"

/profile set dev

#### **1.2.3 Quản Lý Context**

\# Thêm file vào profile context

/context add README.md

\# Thêm file vào global context

/context add \--global coding-standards.md

\# Thêm nhiều files cùng lúc

/context add docs/\*.md

\# Xem context hiện tại

/context show

\# Xóa file khỏi profile context

/context rm docs/architecture.md

\# Xóa file khỏi global context

/context rm \--global coding-standards.md

\# Xóa tất cả files khỏi profile context

/context clear

\# Xóa tất cả files khỏi global context

/context clear \--global

#### **1.2.4 Context Hooks** 

Context hooks cho phép tự động đưa kết quả của các lệnh shell vào context:  
**\- Các loại Context Hooks**

* **Conversation start hooks**: chạy một lần khi bắt đầu hội thoại  
* **Per-prompt hooks**: chạy mỗi lần gửi prompt

**\- Quản lý Context Hooks**  
\# Xem tất cả hooks đã cấu hình

/context hooks

\# Thêm hook mới

/context hooks add \[--global\] \<name\> \--trigger \<trigger\> \--command \<command\>

\# Xóa hook

/context hooks rm \<name\> \[--global\]

\# Bật/tắt hook

/context hooks enable \[--global\] \<name\>

/context hooks disable \[--global\] \<name\>  
**\- Ví dụ Context Hooks cho TPBank**  
/context hooks add git-status \--trigger per\_prompt \--command "git status \--short"

/context hooks add project-info \--trigger conversation\_start \--command "echo 'Project: '$(basename $(pwd))"

/context hooks add tpb-project \--trigger conversation\_start \--command "echo 'Project: '$(basename $(pwd)) && echo 'Tech stack: Spring Boot, Angular' && echo 'Team: '$(git config user.name)"

/context hooks add tpb-structure \--trigger conversation\_start \--command "find . \-type f \-name '\*.java' | grep \-v '/test/' | sort | head \-20"

#### **1.2.5 Ứng Dụng Profiles cho TPBank**

**\- Theo Dự Án**  
/profile create hydro-dcb

/context add ./hydro-dcb/README.md ./hydro-dcb/docs/\*.md

/profile create tpbworld-ams

/context add ./tpbworld-ams/README.md ./tpbworld-ams/docs/\*.md  
**\- Theo Vai Trò**  
/profile create backend-dev

/context add backend-standards.md api-docs/\*.md

/profile create qa-engineer

/context add testing-standards.md test-cases/\*.md  
**\- Thêm Project Context**  
/context add .amazonq/project-intelligence/\*.md

/context add \--global .amazonq/project-intelligence/product-requirements.md  
**\- Lợi Ích**

* Nhất quán trong coding standards  
* Tăng hiệu quả làm việc và hỗ trợ onboarding  
* Quản lý kiến thức tập trungs

### **1.3. Bảo Mật Khi Dùng Amazon Q CLI**

Khi dùng `/tools` in Amazon Q CLI, chú ý những điều sau:

* `/tools untrust fs_read`  
* Không dùng `/trustall` bừa bãi  
* Cô lập môi trường phát triển  
* Tránh đặt file nhạy cảm trong context

## **2\. Phương pháp tạo prompt hiệu quả và Cách dùng thư viện prompt**

Bao gồm việc tạo prompt hiệu quả, tận dụng các built-in directives, và tạo thư viện prompt cho các tác vụ lặp đi lặp lại

### **2.1 Nguyên Tắc Tạo Prompt**

#### **2.1.1 Cấu Trúc Prompt**

\[Business Context\]

\[Technical Details\]

\[Specific Request\]

\[Output Format\]

#### **2.1.2 Kỹ Thuật Nâng Cao**

* Context Awareness: `@workspace`, `@file`  
* Agentic: `/dev`, `/test, /doc, /review, /transform`  
* Reuse: `@prompt`

### **2.2 Prompt Library**

**Tạo Prompt:**

* Trong IDE: `@` → Prompts → Create new  
* Đặt tên \+ nội dung → Save

**Dùng Prompt:**

* Gõ `@` → chọn prompt → sửa → gửi

### **2.3 Tạo thư viện những Prompt thường dùng**

**2.3.1. Ví dụ 1: Tự động hóa Automation Testing**  
\- **Step 1**: Lưu prompt template vào thư viện với tên là write\_test\_case  
   \`\`\`  
   Tạo test cases cho user story sau:

   \[miêu tả về user story\]  
   Yêu cầu:  
   \- Tạo test cases cho happy path  
   \- Tạo test cases cho các trường hợp lỗi (số dư không đủ, OTP không đúng, timeout)  
   \- Tạo test cases cho các edge cases (chuyển số tiền rất nhỏ, rất lớn)  
   \- Tạo test cases cho vấn đề bảo mật  
   \`\`\`  
\- **Step 2**: Sử dụng prompt template sẵn có để tạo prompt  
Prompt: @write\_test\_case Tạo test cases cho user story sau: "Là khách hàng của TPBank, tôi muốn chuyển tiền giữa các tài khoản của mình để quản lý tiền hiệu quả hơn. Tôi cần chọn tài khoản nguồn, tài khoản đích, nhập số tiền, xác nhận OTP và nhận thông báo kết quả giao dịch."

**3.2.2. Ví dụ 2: Tự động hóa tạo TLPT**  
\- **Step 1**: Lưu prompt template vào thư viện với tên là write\_TLPT\_doc  
   \`\`\`  
   Tạo Tài Liệu Phân Tích Thiết Kế (TLPT) cho \[miêu tả chức năng\]  
   TLPT cần bao gồm:  
   1\. Mô tả tổng quan  
   2\. Business requirements  
   3\. Functional requirements  
   4\. Non-functional requirements  
   5\. User flows với diagrams (sử dụng mermaid)  
   6\. Data models  
   7\. API specifications  
   8\. Acceptance criteria  
   \`\`  
\- **Step 2**: Sử dụng prompt template sẵn có để tạo prompt  
Prompt: @write\_TLPT\_doc tạo tài liệu TLPT cho chức năng "Quản lý hạn mức giao dịch" với yêu cầu sau:  
   "Khách hàng cần có khả năng thiết lập và quản lý hạn mức giao dịch cho các loại giao dịch khác nhau (chuyển khoản, thanh toán hóa đơn, rút tiền). Hệ thống cần kiểm tra hạn mức trước khi thực hiện giao dịch và thông báo cho khách hàng nếu vượt quá hạn mức. Khách hàng có thể thay đổi hạn mức nhưng cần xác thực OTP. Quản trị viên có thể thiết lập hạn mức mặc định theo phân khúc khách hàng."

**3.2.3. Ví dụ 3: Tự động hóa Frontend Processing**   
\- **Step 1**: Lưu prompt template vào thư viện với tên là create\_react\_component  
     \`\`\`  
 Hãy tạo một React component với các chức năng sau:

Chức năng:  
\[mô tả về chức năng\]

Yêu cầu kỹ thuật:  
\- Sử dụng \`react-hook-form\` để quản lý form.  
\- Tích hợp \`redux\` để quản lý trạng thái toàn cục.  
\- Xử lý các trạng thái: loading, error, success.  
\- Responsive, hiển thị tốt trên cả mobile và desktop.

Yêu cầu bổ sung:  
\- Viết unit test cho component.  
\- Tạo hàm tích hợp với API liên quan.

Lưu ý:  
\- Code rõ ràng, dễ bảo trì và tái sử dụng.  
\- Tuân thủ best practices của React, Redux và TypeScript.  
\- Có thể dùng thư viện UI nếu phù hợp (như Tailwind, MUI).

Hãy cung cấp đầy đủ mã nguồn cho component, test và service liên quan.

   \`\`\`  
\- **Step 2**: Sử dụng prompt template sẵn có để tạo prompt  
Prompt: @create\_react\_component cho chức năng:  
\- Hiển thị danh sách phương thức thanh toán: thẻ ngân hàng, ví điện tử, chuyển khoản.  
\- Form nhập thông tin thanh toán, có đầy đủ validation.

## **3\. Tự động hóa các tác vụ lặp đi lặp lại**

Bao gồm việc viết các automation script cho việc sử dụng  cho những nhóm người và quy trình chuyên biệt

### **3.1 Tự Động Hóa Quy Trình**

| Nhóm người dùng | Quy trình | Giải pháp Amazon Q |
| :---- | :---- | :---- |
| Developers | Frontend Processing | Tự động tạo UI, CSS, validation |
| Developers | Xử lý dữ liệu lớn | Tạo query tối ưu, phân trang, batch |
| QA | Automation Testing | Tạo automation script for create test cases, write test cases,  |
| BA | Tạo tài liệu | Tạo TLPT, user stories, API docs |
| Tất cả | Code Review | Checklist review, phân tích code, gợi ý cải tiến |

### **3.2. Ví dụ 1: Tạo automation script cho QA**

\- **Automation** **Script Hỗ Trợ QA**: [qa-helper.sh](http://qa-helper.sh)  
\`\`\`  
\#\!/bin/bash

function generate\_tests() {  
  echo "🔧 Generating tests for feature: $1"  
  q chat "Tạo test case cho API endpoint $1 với các yêu cầu sau:\\n- Kiểm tra response status code\\n- Kiểm tra cấu trúc response\\n- Kiểm tra business logic\\n- Kiểm tra error handling\\n- Kiểm tra performance (response time \< 200ms)\\n\\nSử dụng Jest và Supertest, tuân thủ cấu trúc test hiện tại của dự án." \> "generated\_test\_$1.js"  
  echo "✅ Test saved to generated\_test\_$1.js"  
}

function analyze\_results() {  
  echo "🔍 Analyzing test results from $1..."  
  q chat "Phân tích lỗi test sau và đề xuất cách sửa và xuất kết quả phân tích ra file test\_analysis.md:\\n\\n$(cat $1)\\n\\nYêu cầu:\\n1. Xác định nguyên nhân gốc rễ của lỗi\\n2. Đề xuất cách sửa cụ thể\\n3. Cung cấp code sửa đổi\\n4. Giải thích tại sao sửa đổi này sẽ giải quyết vấn đề"   
  echo "✅ Analysis complete successfully"  
}

function fix\_tests() {  
  echo "🛠️ Đang sửa lỗi test từ file kết quả $1..."  
  echo "📎 Đang kết hợp $1 và $2 để gợi ý sửa lỗi..."  
  q chat "Dựa trên nội dung sau từ test-results.json:\\n\\n$(cat $1)\\n\\nVà phân tích lỗi trong test\_analysis.md:\\n\\n$(cat $2)\\n\\nHãy đề xuất cách sửa cụ thể từng test case bị lỗi và cung cấp đoạn code đã chỉnh sửa. Và xuất các gợi ý chỉnh sửa ra file: test\_fix\_suggestions.md"   
  echo "✅ Gợi ý sửa lỗi đã lưu vào test\_fix\_suggestions.md"  
}

function optimize\_suite() {  
  echo "🧠 Optimizing test suite in $1..."  
  q chat "Phân tích test suite trong thư mục $1 và đề xuất cách tối ưu hóa và cập nhật thư mục tương ứng:\\n\\nYêu cầu:\\n1. Xác định các test chạy chậm và đề xuất cách tối ưu\\n2. Xác định các test flaky và đề xuất ổn định hóa\\n3. Đề xuất tổ chức test suite để chạy nhanh hơn\\n4. Đề xuất test cases bổ sung để tăng coverage" \> optimization\_suggestions.md  
  echo "✅ Optimization saved to optimization\_suggestions.md"  
}

function run\_tests() {  
  echo "🧪 Running tests and exporting to test-results.json..."  
  npx jest \--json \--outputFile=test-results.json  
  echo "✅ Test results saved to test-results.json"  
}

case "$1" in  
  generate)  
    generate\_tests "$2" "$3"  
    ;;  
  analyze)  
    analyze\_results "$2"  
    ;;  
  fix)  
    fix\_tests "$2" "$3"  
    ;;  
  optimize)  
    optimize\_suite "$2"  
    ;;  
  run)  
    run\_tests  
    ;;  
  \*)  
    echo "Usage: $0 {generate|analyze|fix|optimize|run} \[params\]"  
    exit 1  
esac

\`\`\`  
\- **Quy trình cho QA khi chạy tests**

| Bước | Hành động | Công cụ |
| ----- | ----- | ----- |
| 1️⃣ | Tạo test case tự động | `qa-helper.sh generate "Create User API"` |
| 2️⃣ | Chạy test và xuất kết quả JSON | `qa-helper.sh run` |
| 3️⃣ | Phân tích lỗi test (nếu có) | `qa-helper.sh analyze test-results.json` |
| 4️⃣ | Sửa test theo gợi ý | `qa-helper.sh fix test-results.json test_analysis.md` |
| 5️⃣ | Tối ưu hóa test suite  | `qa-helper.sh optimize` |

**\- Tạo alias để chạy command nhanh hơn**   
`alias qgen='./qa-helper.sh generate'`  
`alias qanalyze='./qa-helper.sh analyze'`  
`alias qfix='./qa-helper.sh fix'`  
`alias qopt='./qa-helper.sh optimize'`  
`alias qrun='./qa-helper.sh run'`

## **4\. Thư viện tham khảo cho prompt và rules**

**\- Prompting**  
	\- Langchain Hub: [https://smith.langchain.com/hub](https://smith.langchain.com/hub)  
	\- PromptZ: [https://www.promptz.dev/prompts](https://www.promptz.dev/prompts)  
**\- Project Rules**  
	\- PromptZ: [https://www.promptz.dev/rules](https://www.promptz.dev/rules)  
	\- Cursor Rules: [https://github.com/PatrickJS/awesome-cursorrules?tab=readme-ov-file](https://github.com/PatrickJS/awesome-cursorrules?tab=readme-ov-file)