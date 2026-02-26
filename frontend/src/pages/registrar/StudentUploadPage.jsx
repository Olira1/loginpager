import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getStudentUploadTemplate, uploadStudents } from '../../services/registrarService';

const StudentUploadPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [templateInfo, setTemplateInfo] = useState(null);

  const onLoadTemplate = async () => {
    try {
      const response = await getStudentUploadTemplate();
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
      const response = await uploadStudents({ file });
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
        <h1 className="text-2xl font-bold text-gray-900">Upload Students</h1>
        <p className="text-gray-500">Bulk import students from an Excel file.</p>
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
        <div className="grid grid-cols-1 gap-3">
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
        </div>
        <p className="text-xs text-gray-500">
          Include <strong>grade</strong>, <strong>class</strong>, and <strong>academic_year</strong> columns inside each Excel row (example: grade=10, class=A or 10A, academic_year=2025 or 2025/2026).
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Students
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

          {(result.results?.created_students || []).length > 0 ? (
            <div className="mt-5">
              <h4 className="font-medium text-gray-900 mb-2">Created Students</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Temp Password</th>
                      <th className="px-3 py-2">Parent</th>
                      <th className="px-3 py-2">Parent Username</th>
                      <th className="px-3 py-2">Parent Temp Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.created_students.map((item) => (
                      <tr key={`created-${item.row_number}-${item.student?.id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.row_number}</td>
                        <td className="px-3 py-2">
                          <div>{item.student?.full_name}</div>
                          <div className="text-xs text-gray-500">{item.student?.student_code}</div>
                        </td>
                        <td className="px-3 py-2">{item.student_credentials?.username || '-'}</td>
                        <td className="px-3 py-2">{item.student_credentials?.temporary_password || '-'}</td>
                        <td className="px-3 py-2">
                          <div>{item.parent?.full_name || '-'}</div>
                          <div className="text-xs text-gray-500">{item.parent?.phone || '-'}</div>
                        </td>
                        <td className="px-3 py-2">{item.parent_credentials?.username || '-'}</td>
                        <td className="px-3 py-2">{item.parent_credentials?.temporary_password || '-'}</td>
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

export default StudentUploadPage;
