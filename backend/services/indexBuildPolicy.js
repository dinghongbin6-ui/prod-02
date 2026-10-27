export function assertIndexBuildCanCommit(failures, rows) {
  if (failures.length > 0) {
    throw new Error(`有 ${failures.length} 个文件未能索引；旧索引保持不变。`);
  }
  if (rows.length === 0) {
    throw new Error("没有可索引的有效文档内容；旧索引保持不变。");
  }
}
