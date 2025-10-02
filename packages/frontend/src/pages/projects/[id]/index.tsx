import {useParams} from "react-router-dom";
import {useEffect, useMemo, useRef, useState} from "react";
import {Button, Input, Slider, Space, Table, Typography, Upload, message, Popconfirm} from "antd";
import {gql, useMutation, useQuery} from "@apollo/client";
import type { UploadProps } from "antd";

type TranslateUnit = { ja: string; fiftytonesromaji: string };
type ContentPayload = { chinese: string; translateList: TranslateUnit[] };
type SubtitleItem = {
  id: string;
  start: number; // seconds
  end: number;   // seconds
  content: ContentPayload;
};

function pad(num: number, size: number) {
  const s = "000" + Math.floor(num);
  return s.slice(s.length - size);
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const milliseconds = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${pad(hours,2)}:${pad(minutes,2)}:${pad(seconds,2)}.${milliseconds.toString().padStart(3,'0')}`;
}

function parseTime(input: string): number {
  // support 00:00:00.000 or 00:00:00,000
  const s = input.trim().replace(",", ".");
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const se = Number(m[3]);
  const ms = Number(m[4] || 0);
  return h * 3600 + mi * 60 + se + ms / 1000;
}

function parseSrt(content: string): SubtitleItem[] {
  const blocks = content.replace(/\r/g, "").split(/\n\n+/);
  const items: SubtitleItem[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length < 2) continue;
    // optional index line
    const timeLine = lines[0].includes("-->") ? lines[0] : lines[1];
    const textLines = lines[0].includes("-->") ? lines.slice(1) : lines.slice(2);
    const tm = timeLine.match(/(\d{2}:\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[\.,]\d{3})/);
    if (!tm) continue;
    const start = parseTime(tm[1]);
    const end = parseTime(tm[2]);
    const text = textLines.join("\n");
    items.push({ id: crypto.randomUUID(), start, end, content: { chinese: text, translateList: [{ ja: "", fiftytonesromaji: "" }] } });
  }
  return items.sort((a,b) => a.start - b.start);
}

function toSrt(items: SubtitleItem[]): string {
  return items
    .sort((a,b) => a.start - b.start)
    .map((it, idx) => {
      const toSrtTime = (s: number) => formatTime(s).replace(".", ",");
      return [
        String(idx + 1),
        `${toSrtTime(it.start)} --> ${toSrtTime(it.end)}`,
        it.content?.chinese || ""
      ].join("\n");
    })
    .join("\n\n");
}

const TimeCell: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const [display, setDisplay] = useState<string>(formatTime(value));
  useEffect(() => {
    setDisplay(formatTime(value));
  }, [value]);
  return (
    <Input
      size="small"
      value={display}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={() => {
        const v = parseTime(display);
        if (isNaN(v)) {
          message.error("时间格式应为 00:00:00.000");
          setDisplay(formatTime(value));
        } else {
          onChange(v);
        }
      }}
    />
  );
};

const ProjectDetail = () => {
  const projectID = useParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);

  const pid = (projectID as any).id as string | undefined;

  const SUBTITLES = gql`
    query Subtitles($input: SubtitleListInput!) {
      subtitles(input: $input) {
        id
        projectID
        startTime
        endTime
        content
      }
    }
  `;
  const CREATE_SUBTITLE = gql`
    mutation CreateSubtitle($input: SubtitleCreateInput!) {
      createSubtitle(input: $input) {
        id
      }
    }
  `;
  const UPDATE_SUBTITLE = gql`
    mutation UpdateSubtitle($input: SubtitleUpdateInput!) {
      updateSubtitle(input: $input) {
        id
      }
    }
  `;
  const DELETE_SUBTITLE = gql`
    mutation DeleteSubtitle($input: SubtitleDeleteInput!) {
      deleteSubtitle(input: $input)
    }
  `;

  const { data, loading, refetch } = useQuery(SUBTITLES, {
    variables: { input: { projectID: pid } },
    skip: !pid,
    fetchPolicy: "cache-and-network",
  });
  const [createSubtitle] = useMutation(CREATE_SUBTITLE);
  const [updateSubtitle] = useMutation(UPDATE_SUBTITLE);
  const [deleteSubtitleMut] = useMutation(DELETE_SUBTITLE);

  useEffect(() => {
    if (!data?.subtitles) return;
    const list = (data.subtitles as any[]).map((s) => {
      const start = parseTime(String(s.startTime));
      const end = parseTime(String(s.endTime));
      const content: ContentPayload = (s.content as any) || { chinese: "", translateList: [{ ja: "", fiftytonesromaji: "" }] };
      if (!Array.isArray(content.translateList) || content.translateList.length === 0) {
        content.translateList = [{ ja: "", fiftytonesromaji: "" }];
      }
      return { id: s.id as string, start, end, content } as SubtitleItem;
    });
    setSubtitles(list);
  }, [data]);

  const onLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(isFinite(d) ? d : 0);
  };

  const onTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    setCurrentTime(t);
  };

  const addFromCurrent = () => {
    const start = videoRef.current?.currentTime ?? 0;
    const end = Math.min(start + 2, duration || start + 2);
    const row: SubtitleItem = { id: crypto.randomUUID(), start, end, content: { chinese: "", translateList: [{ ja: "", fiftytonesromaji: "" }] } };
    setSubtitles((prev) => [
      ...prev,
      row,
    ].sort((a,b) => a.start - b.start));
    if (pid) {
      void createSubtitle({
        variables: {
          input: {
            projectID: pid,
            startTime: formatTime(start),
            endTime: formatTime(end),
            content: row.content,
          }
        }
      }).then(() => refetch());
    }
  };

  const deleteRow = (id: string) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
    void deleteSubtitleMut({ variables: { input: { id } } }).then(() => refetch());
  };

  const playAt = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration || time));
    void videoRef.current.play();
  };

  const columns = [
    { title: "#", width: 48, render: (_: unknown, __: SubtitleItem, idx: number) => idx + 1 },
    {
      title: "开始",
      dataIndex: "start",
      width: 150,
      render: (_: unknown, record: SubtitleItem) => (
        <TimeCell value={record.start} onChange={(v) => {
          setSubtitles((prev) => prev.map(s => s.id === record.id ? { ...s, start: Math.min(v, s.end) } : s));
        }} />
      )
    },
    {
      title: "结束",
      dataIndex: "end",
      width: 150,
      render: (_: unknown, record: SubtitleItem) => (
        <TimeCell value={record.end} onChange={(v) => {
          setSubtitles((prev) => prev.map(s => s.id === record.id ? { ...s, end: Math.max(v, s.start) } : s));
        }} />
      )
    },
    {
      title: "中文",
      render: (_: unknown, record: SubtitleItem) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={record.content?.chinese || ""}
          onChange={(e) => {
            const val = e.target.value;
            setSubtitles((prev) => prev.map(s => s.id === record.id ? { ...s, content: { ...s.content, chinese: val } } : s));
          }}
        />
      )
    },
    {
      title: "日文",
      render: (_: unknown, record: SubtitleItem) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={record.content?.translateList?.[0]?.ja || ""}
          onChange={(e) => {
            const val = e.target.value;
            setSubtitles((prev) => prev.map(s => {
              if (s.id !== record.id) return s;
              const list = Array.isArray(s.content.translateList) && s.content.translateList.length > 0 ? s.content.translateList.slice() : [{ ja: "", fiftytonesromaji: "" }];
              list[0] = { ...list[0], ja: val };
              return { ...s, content: { ...s.content, translateList: list } };
            }));
          }}
        />
      )
    },
    {
      title: "罗马音",
      render: (_: unknown, record: SubtitleItem) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={record.content?.translateList?.[0]?.fiftytonesromaji || ""}
          onChange={(e) => {
            const val = e.target.value;
            setSubtitles((prev) => prev.map(s => {
              if (s.id !== record.id) return s;
              const list = Array.isArray(s.content.translateList) && s.content.translateList.length > 0 ? s.content.translateList.slice() : [{ ja: "", fiftytonesromaji: "" }];
              list[0] = { ...list[0], fiftytonesromaji: val };
              return { ...s, content: { ...s.content, translateList: list } };
            }));
          }}
        />
      )
    },
    {
      title: "操作",
      width: 160,
      render: (_: unknown, record: SubtitleItem) => (
        <Space size={8}>
          <Button size="small" onClick={() => playAt(record.start)}>播放</Button>
          <Button size="small" type="primary" onClick={() => {
            void updateSubtitle({
              variables: {
                input: {
                  id: record.id,
                  startTime: formatTime(record.start),
                  endTime: formatTime(record.end),
                  content: record.content,
                }
              }
            }).then(() => refetch());
          }}>保存</Button>
          <Popconfirm title="删除此条字幕？" onConfirm={() => deleteRow(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        if (file.name.toLowerCase().endsWith(".srt")) {
          try {
            const items = parseSrt(text);
            setSubtitles(items);
            message.success(`已导入 ${items.length} 条字幕`);
          } catch (e) {
            message.error("SRT 解析失败");
          }
        } else if (file.name.toLowerCase().endsWith(".json")) {
          try {
            const data = JSON.parse(text) as SubtitleItem[];
            if (Array.isArray(data)) {
              setSubtitles(data.map((d) => ({ ...d, id: d.id || crypto.randomUUID() })));
              message.success(`已导入 ${data.length} 条字幕`);
            } else {
              message.error("JSON 格式不正确");
            }
          } catch (e) {
            message.error("JSON 解析失败");
          }
        } else {
          message.warning("仅支持 .srt 或 .json 文件");
        }
      };
      reader.readAsText(file);
      return false; // 阻止上传
    }
  };

  const exportSrt = () => {
    const blob = new Blob([toSrt(subtitles)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles_${projectID.id || "project"}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(subtitles, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles_${projectID.id || "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSubtitleIndex = useMemo(() => {
    return subtitles.findIndex(s => currentTime >= s.start && currentTime <= s.end);
  }, [currentTime, subtitles]);

  return (
    <div className="p-4 h-full grid grid-cols-12 gap-4">
      <div className="col-span-7 flex flex-col gap-3">
        <div className="w-full">
          <video
            ref={videoRef}
            className="w-full rounded-md bg-black"
            src={'http://192.168.3.52:3000/public/app/f7979606eb56f96f0f2f1f792cf7f2dcc8fbce01eda89db0d0dd2488413ce1b5.mp4'}
            controls
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
        <div className="px-2 py-3 rounded-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Typography.Text>时间轴</Typography.Text>
            <Space>
              <Button size="small" onClick={() => playAt(Math.max(0, currentTime - 3))}>-3s</Button>
              <Button size="small" onClick={() => playAt(currentTime)}>播放</Button>
              <Button size="small" onClick={() => addFromCurrent()}>在当前位置添加</Button>
            </Space>
          </div>
          <Slider
            min={0}
            max={Math.max(duration, 0.001)}
            step={0.01}
            value={currentTime}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
            onChange={(v) => {
              const t = Array.isArray(v) ? v[0] : v;
              setCurrentTime(t as number);
              if (videoRef.current) {
                videoRef.current.currentTime = t as number;
              }
            }}
          />
          <div className="relative h-3 w-full bg-gray-100 rounded">
            {duration > 0 && subtitles.map((s) => {
              const left = `${(s.start / duration) * 100}%`;
              const width = `${(Math.max(0, s.end - s.start) / duration) * 100}%`;
              return (
                <div
                  key={s.id}
                  className="absolute top-0 h-3 bg-blue-400/60 hover:bg-blue-500 rounded"
                  style={{ left, width }}
                  title={`${formatTime(s.start)} - ${formatTime(s.end)}\n${s.content?.chinese || ""}`}
                />
              );
            })}
            {duration > 0 && (
              <div
                className="absolute top-0 h-3 w-0.5 bg-red-500"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 flex justify-between">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="col-span-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Typography.Title level={5} style={{ margin: 0 }}>字幕</Typography.Title>
          <Space>
            <Upload {...uploadProps} accept=".srt,.json" showUploadList={false}>
              <Button>导入</Button>
            </Upload>
            <Button onClick={exportSrt}>导出 SRT</Button>
            <Button onClick={exportJson}>导出 JSON</Button>
          </Space>
        </div>
        <Table
          size="small"
          rowKey="id"
          dataSource={subtitles}
          columns={columns as any}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowClassName={(_record, index) => index === activeSubtitleIndex ? "bg-yellow-50" : ""}
          sticky
        />
      </div>
    </div>
  );
}

export default ProjectDetail
