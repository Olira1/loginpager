import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getTeacherUploadTemplate, uploadTeachers } from '../../services/registrarService';

const TeacherUploadPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [templateInfo, setTemplateInfo] = useState(null);

  const onLoadTemplate = async () => {
    try {
      const response = await getTeacherUploadTemplate();
      if (response.success) {
        setTemplateInfo(response.data);
      } else {
        setError(response.error?.message || 'Failed to load template info.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load template info.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Please choose an .xlsx file.');
      return;
    }

    try {
      setLoading(true);
      const response = await uploadTeachers({ file });
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error?.message || 'Upload failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Teachers</h1>
        <p className="text-gray-500">Bulk import teachers from an Excel file.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Template</h2>
          <button
            onClick={onLoadTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Load Template Info
          </button>
        </div>
        {templateInfo ? (
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Filename:</span> {templateInfo.filename}</p>
            <p><span className="font-medium">Required columns:</span> {templateInfo.columns?.join(', ')}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Load template info before preparing your file.</p>
        )}
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Excel File (.xlsx)</label>
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50">
            <FileSpreadsheet className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{file ? file.name : 'Choose file'}</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Teachers
        </button>
      </form>

      {result ? (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-semibold">Upload Processed</h3>
          </div>
          <div className="text-sm text-gray-700 mt-3 space-y-1">
            <p><span className="font-medium">Upload ID:</span> {result.upload_id}</p>
            <p><span className="font-medium">Total rows:</span> {result.total_rows}</p>
            <p><span className="font-medium">Successful:</span> {result.successful}</p>
            <p><span className="font-medium">Failed:</span> {result.failed}</p>
          </div>

          {(result.results?.created_teachers || []).length > 0 ? (
            <div className="mt-5">
              <h4 className="font-medium text-gray-900 mb-2">Created Teachers</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Teacher</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Temp Password</th>
                      <th className="px-3 py-2">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.created_teachers.map((item) => (
                      <tr key={`created-${item.row_number}-${item.teacher?.id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.row_number}</td>
                        <td className="px-3 py-2">
                          <div>{item.teacher?.full_name}</div>
                          <div className="text-xs text-gray-500">{item.teacher?.staff_code}</div>
                        </td>
                        <td className="px-3 py-2">{item.credentials?.username || '-'}</td>
                        <td className="px-3 py-2">{item.credentials?.temporary_password || '-'}</td>
                        <td className="px-3 py-2">
                          <div>{item.teacher?.email || '-'}</div>
                          <div className="text-xs text-gray-500">{item.teacher?.phone || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {(result.results?.failed_rows || []).length > 0 ? (
            <div className="mt-5">
              <h4 className="font-medium text-red-700 mb-2">Failed Rows</h4>
              <div className="overflow-x-auto border border-red-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-red-50">
                    <tr className="text-left text-red-700">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.failed_rows.map((item) => (
                      <tr key={`failed-${item.row_number}`} className="border-t border-red-100">
                        <td className="px-3 py-2">{item.row_number}</td>
                        <td className="px-3 py-2">{item.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TeacherUploadPage;
