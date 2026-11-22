# 驗收腳本共用：每件重工作各過一次桌機閘門、做完交還。用法：腳本裡 source tools/gated.sh 之後
#   gated <指令…>     一般的一件
#   gated_x <指令…>   -Exclusive：只給量效能、或怕別人負載造成假紅的測試；呼叫那行要註明理由
# 每個驗收條件各包一次，不要把整份腳本包成一件；效能量測同一組改前／改後算一件，組內不放掉。
# 整段寫成腳本檔再跑：命令列上直接寫長指令又接管線，閘門會把自己的 bash 認成重工作、等自己等不完（2026-11-23 實際卡 10 分鐘）。
# GATE_LOG＝閘門輸出要寫到哪（不設就丟掉）。
GATE="powershell -NoProfile -File C:/Users/shung/tether-wt/gate.ps1"
_gated() { local ex="$1"; shift; $GATE -Wait $ex >> "${GATE_LOG:-/dev/null}" 2>&1 || { echo "閘門沒放行：$*" >&2; return 97; }; "$@"; local r=$?; $GATE -Release >> "${GATE_LOG:-/dev/null}" 2>&1; return $r; }
gated() { _gated "" "$@"; }
gated_x() { _gated "-Exclusive" "$@"; }
