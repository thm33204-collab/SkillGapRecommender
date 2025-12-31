import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UploadCV = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setLoading(true);
    onUpload(file);

    setTimeout(() => setLoading(false), 1500); // giả lập loading
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl">Tải lên CV của bạn</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Upload Box */}
        <label
          htmlFor="cvUpload"
          className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-primary/40 rounded-xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition"
        >
          <Upload className="h-10 w-10 text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            Nhấn để chọn CV (.pdf, .docx, .txt)
          </p>
          <input
            id="cvUpload"
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* File info */}
        {file && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              "Tải lên CV"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadCV;
