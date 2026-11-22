# 驗收腳本共用：每件重工作各過一次桌機閘門、做完交還。用法：腳本裡 source tools/gated.sh 之後
#   gated <指令…>     一般的一件
#   gated_x <指令…>   -Exclusive：只給量效能、或怕別人負載造成假紅的測試；呼叫那行要註明理由
# 每個驗收條件各包一次，不要把整份腳本包成一件；效能量測同一組改前／改後算一件，組內不放掉。
# 整段寫成腳本檔再跑：命令列上直接寫長指令又接管線，閘門會把自己的 bash 認成重工作、等自己等不完（2026-11-23 實際卡 10 分鐘）。
# 不要巢狀：被包的指令裡再呼叫 gated，內層交還會把外層的租約還掉。被包的函式裡不要 exit：會跳過交還，要等腳本結束才失效。
# 桌機目前（2026-11-23）從腳本呼叫，gated 與 gated_x 都會被判成獨佔；差別留給之後的放行規則，所以照實分。
# GATE_LOG＝閘門輸出要寫到哪（不設就丟掉）。
GATE="powershell -NoProfile -File C:/Users/shung/tether-wt/gate.ps1"
_gated() {
  local ex="$1" log="${GATE_LOG:-/dev/null}" r=0; shift
  case "$log" in /*|[A-Za-z]:*) ;; *) log="$PWD/$log" ;; esac # 先記成絕對路徑：被包的指令 cd 走之後，相對路徑寫不進去，bash 會整條不執行、閘門就漏還
  $GATE -Wait $ex >> "$log" 2>&1 || { echo "閘門沒放行：$*" >&2; return 97; }
  "$@" || r=$? # 寫成 || 是讓呼叫端有 set -e 時也走得到下面的交還（代價：被包的函式裡 set -e 不會中途停，要自己回傳失敗碼）
  $GATE -Release >> "$log" 2>&1 || $GATE -Release > /dev/null 2>&1 || echo "閘門沒交還成功（腳本結束才會失效）：$*" >&2
  return $r
}
gated() { _gated "" "$@"; }
gated_x() { _gated "-Exclusive" "$@"; }
