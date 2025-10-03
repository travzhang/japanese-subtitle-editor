import {useParams} from "react-router-dom";
import {useEffect, useMemo, useRef, useState} from "react";
import {Button, Input, Slider, Space, Typography, message, Popconfirm, Drawer, Form, List, Tooltip} from "antd";
import {gql, useMutation, useQuery} from "@apollo/client";
import { PlayCircleOutlined, EditOutlined, SaveOutlined, DeleteOutlined, RetweetOutlined, MenuOutlined } from "@ant-design/icons";
import ContentRender from "@/components/ContentRender";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

type TranslateUnit = { ja: string; fiftytones: string; romaji: string };
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

//

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
          message.error("時間の形式は 00:00:00.000 である必要があります");
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
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<SubtitleItem | null>(null);
  const [form] = Form.useForm();
  const [loop, setLoop] = useState<{ id: string; start: number; end: number } | null>(null);
  // 保留占位，后续若需要行级编辑状态可启用

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
      const raw = (s.content as any) || { chinese: "", translateList: [{ ja: "", fiftytones: "", romaji: "" }] };
      let translateList: TranslateUnit[] = Array.isArray(raw.translateList) ? raw.translateList.map((it: any) => ({
        ja: String(it?.ja ?? ""),
        fiftytones: String(it?.fiftytones ?? ""),
        romaji: String((it?.romaji ?? it?.fiftytonesromaji) ?? ""), // 向后兼容
      })) : [];
      if (translateList.length === 0) translateList = [{ ja: "", fiftytones: "", romaji: "" }];
      const content: ContentPayload = { chinese: String(raw.chinese ?? ""), translateList };
      return { id: s.id as string, start, end, content } as SubtitleItem;
    });
    const sorted = [...list].sort((a,b) => a.start - b.start);
    setSubtitles(sorted);
  }, [data]);

  const onLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(isFinite(d) ? d : 0);
  };

  const onTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    // 循环播放逻辑：若开启循环且到达片段末尾，跳回片段开始
    if (videoRef.current && loop) {
      const { start, end } = loop;
      if (isFinite(start) && isFinite(end) && end > start) {
        if (t > end - 0.01) {
          videoRef.current.currentTime = Math.max(0, start);
          void videoRef.current.play();
        }
      }
    }
    setCurrentTime(t);
  };

  const addFromCurrent = () => {
    const start = videoRef.current?.currentTime ?? 0;
    const end = Math.min(start + 2, duration || start + 2);
    const row: SubtitleItem = { id: String(Math.random()), start, end, content: { chinese: "", translateList: [{ ja: "", fiftytones: "", romaji: "" }] } };
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

  const toggleLoop = (record: SubtitleItem) => {
    setLoop((prev) => {
      if (prev?.id === record.id) return null;
      return { id: record.id, start: record.start, end: record.end };
    });
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(record.start, duration || record.start));
      void videoRef.current.play();
    }
  };

  const openDrawer = (record: SubtitleItem) => {
    setEditing(record);
    setDrawerOpen(true);
    form.setFieldsValue({
      chinese: record.content?.chinese ?? "",
      translateList: (record.content?.translateList ?? []).map(it => ({
        ja: it.ja ?? "",
        fiftytones: it.fiftytones ?? "",
        romaji: it.romaji ?? "",
      }))
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveDrawer = async () => {
    try {
      const values = await form.validateFields();
      const updatedContent: ContentPayload = {
        chinese: values.chinese ?? "",
        translateList: (values.translateList || []).map((it: any) => ({
          ja: String(it?.ja ?? ""),
          fiftytones: String(it?.fiftytones ?? ""),
          romaji: String(it?.romaji ?? ""),
        })),
      };
      if (!editing) return;
      setSubtitles(prev => prev.map(s => s.id === editing.id ? { ...s, content: updatedContent } : s));
      await updateSubtitle({
        variables: {
          input: {
            id: editing.id,
            startTime: formatTime(editing.start),
            endTime: formatTime(editing.end),
            content: updatedContent,
          }
        }
      });
      await refetch();
      closeDrawer();
      message.success("保存しました");
    } catch (e) {
      // 校验失败或保存失败
    }
  };

  // 使用 List 渲染每条字幕，保留时间编辑与操作按钮

  

  const activeSubtitleIndex = useMemo(() => {
    return subtitles.findIndex(s => currentTime >= s.start && currentTime <= s.end);
  }, [currentTime, subtitles]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;
    setSubtitles(prev => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved);
      return next;
    });
  };

  return (
    <div className="p-4 h-full grid grid-cols-12 gap-4">
      <div className="col-span-7 flex flex-col gap-3">
        <div className="w-full">
          <video
            ref={videoRef}
            className="w-full rounded-md bg-black"
            src={'https://wrzhang25-subtitle.oss-ap-northeast-1.aliyuncs.com/1.mp4'}
            controls
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
        <div className="px-2 py-3 rounded-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Typography.Text>タイムライン</Typography.Text>
            <Space>
              <Button size="small" onClick={() => playAt(Math.max(0, currentTime - 3))}>-3s</Button>
              <Button size="small" onClick={() => playAt(currentTime)}>再生</Button>
              <Button size="small" onClick={() => addFromCurrent()}>現在位置に追加</Button>
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
        {/* <div className="flex items-center justify-between"> */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="subtitle-list">
            {(provided: any) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <List
                  size="small"
                  loading={loading}
                  dataSource={subtitles}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  renderItem={(record: SubtitleItem, index: number) => {
                    const activeId = subtitles[activeSubtitleIndex]?.id;
                    const isActive = activeId && activeId === record.id;
                    return (
                      <Draggable draggableId={record.id} index={index}>
                        {(dragProvided: any) => (
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                            <List.Item key={record.id} className={isActive ? "group bg-yellow-50" : "group"}>
                              <List.Item.Meta
                                title={
                                  <div className="flex gap-3 items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 w-10">開始</span>
                                      <TimeCell value={record.start} onChange={(v) => {
                                        setSubtitles((prev) => prev.map(s => s.id === record.id ? { ...s, start: Math.min(v, s.end) } : s));
                                      }} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 w-10">終了</span>
                                      <TimeCell value={record.end} onChange={(v) => {
                                        setSubtitles((prev) => prev.map(s => s.id === record.id ? { ...s, end: Math.max(v, s.start) } : s));
                                      }} />
                                    </div>
                                    <div className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                      <Tooltip title="再生">
                                        <Button size="small" type="text" icon={<PlayCircleOutlined />} onClick={() => playAt(record.start)} />
                                      </Tooltip>
                                      <Tooltip title="ループ再生">
                                        <Button size="small" type={loop?.id === record.id ? "primary" : "text"} icon={<RetweetOutlined />} onClick={() => toggleLoop(record)} />
                                      </Tooltip>
                                      <Tooltip title="編集">
                                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
                                      </Tooltip>
                                      <Tooltip title="保存">
                                        <Button size="small" type="text" icon={<SaveOutlined />} onClick={() => {
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
                                        }} />
                                      </Tooltip>
                                      <Popconfirm title="この字幕を削除しますか？" onConfirm={() => deleteRow(record.id)}>
                                        <Tooltip title="削除">
                                          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                        </Tooltip>
                                      </Popconfirm>
                                    </div>
                                  </div>
                                }
                                description={
                                  <div className="mt-2">
                                    <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ margin: 0 }}>
                                      {record.content?.chinese || ""}
                                    </Typography.Paragraph>
                                    <div className="mt-2">
                                      <ContentRender content={record.content} />
                                    </div>
                                  </div>
                                }
                              />
                            </List.Item>
                          </div>
                        )}
                      </Draggable>
                    );
                  }}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <Drawer
        title="字幕を編集"
        placement="right"
        width="50%"
        onClose={closeDrawer}
        open={drawerOpen}
        extra={
          <Space>
            <Button onClick={closeDrawer}>キャンセル</Button>
            <Button type="primary" onClick={saveDrawer}>保存</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="chinese" label="中国語">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Form.List name="translateList">
            {(fields, { add, remove, move }) => (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Typography.Text>翻訳リスト</Typography.Text>
                  <Button size="small" onClick={() => add({ ja: "", fiftytones: "", romaji: "" })}>項目を追加</Button>
                </div>
                <DragDropContext
                  onDragEnd={(result: DropResult) => {
                    if (!result.destination) return;
                    if (result.source.index === result.destination.index) return;
                    move(result.source.index, result.destination.index);
                  }}
                >
                  <Droppable droppableId="translate-table">
                    {(provided: any) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="rounded-md border overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 border-b sticky top-0 z-10">
                          <div className="col-span-4 font-medium text-gray-700">日本語</div>
                          <div className="col-span-4 font-medium text-gray-700">五十音</div>
                          <div className="col-span-3 font-medium text-gray-700">ローマ字</div>
                          <div className="col-span-1 font-medium text-right text-gray-700">操作</div>
                        </div>
                        {fields.map((field, idx) => (
                          <Draggable key={field.key} draggableId={String(field.key)} index={idx}>
                            {(dragProvided: any, snapshot: any) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`grid grid-cols-12 gap-2 items-center px-3 py-2 transition-all ${idx % 2 ? 'bg-gray-50' : 'bg-white'} ${snapshot.isDragging ? 'shadow-sm ring-1 ring-blue-200 bg-white' : ''}`}
                              >
                                <div className="col-span-4 flex items-center gap-2">
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<MenuOutlined />}
                                    className="cursor-grab text-gray-500 hover:text-gray-700"
                                    {...dragProvided.dragHandleProps}
                                  />
                                  <Form.Item name={[field.name, 'ja']} style={{ margin: 0, width: '100%' }}>
                                    <Input size="small" />
                                  </Form.Item>
                                </div>
                                <div className="col-span-4">
                                  <Form.Item name={[field.name, 'fiftytones']} style={{ margin: 0 }}>
                                    <Input size="small" />
                                  </Form.Item>
                                </div>
                                <div className="col-span-3">
                                  <Form.Item name={[field.name, 'romaji']} style={{ margin: 0 }}>
                                    <Input size="small" />
                                  </Form.Item>
                                </div>
                                <div className="col-span-1 text-right">
                                  <Button danger size="small" type="text" onClick={() => remove(field.name)}>削除</Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </div>
  );
}

export default ProjectDetail
