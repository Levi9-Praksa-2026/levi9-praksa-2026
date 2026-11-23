import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('coverage_report', Path(__file__).with_name('coverage_report.py'))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class CoverageReportTests(unittest.TestCase):
    def test_invalid_report_is_marked_unavailable(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'coverage-report/target/site/jacoco-aggregate'
            target.mkdir(parents=True)
            (target / 'jacoco.xml').write_text('<report>')
            (target / 'index.html').write_text('<html><body>Broken report</body></html>')
            self.assertFalse(report.write_summary(root, [dict(name='service', status='UNKNOWN', available=True)], True))
            self.assertIn('Unavailable', (target / 'index.html').read_text())

    def test_missing_data_zero_coverage_and_low_coverage_are_distinct(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'coverage-report/target/site/jacoco-aggregate'
            target.mkdir(parents=True)
            (target / 'index.html').write_text('<html><body>JaCoCo report</body></html>')
            (target / 'jacoco.xml').write_text('''<report>
                <group name="zero"><counter type="LINE" covered="0" missed="10"/></group>
                <group name="low"><counter type="LINE" covered="2" missed="8"/></group>
                </report>''')
            rows = [dict(name='zero', status='SUCCESS', available=True),
                    dict(name='low', status='FAILURE', available=True),
                    dict(name='missing', status='FAILURE', available=False)]
            with patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary.md')}):
                report.write_summary(root, rows, True)
            summary = (root / 'summary.md').read_text()
            self.assertIn('| zero | SUCCESS | 0.0% |', summary)
            self.assertIn('| low | FAILURE | 20.0% (partial / failed verification) |', summary)
            self.assertIn('| missing | FAILURE | Unavailable', summary)
            self.assertTrue((target / 'coverage-status.html').exists())
            self.assertIn('Unavailable', (target / 'index.html').read_text())
            self.assertIn('20.0%', (target / 'index.html').read_text())

    def test_report_failure_does_not_reuse_stale_xml_as_measured_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'coverage-report/target/site/jacoco-aggregate'
            target.mkdir(parents=True)
            (target / 'index.html').write_text('<html><body>Old successful report</body></html>')
            (target / 'jacoco.xml').write_text('<report><group name="service"><counter type="LINE" covered="10" missed="0"/></group></report>')
            report.write_summary(root, [dict(name='service', status='FAILURE', available=True)], False)
            self.assertNotIn('100.0%', (target / 'coverage-status.md').read_text())
            self.assertIn('Unavailable', (target / 'coverage-status.md').read_text())
            self.assertNotIn('Old successful report', (target / 'index.html').read_text())
            self.assertIn('Combined report generation failed', (target / 'index.html').read_text())

    def test_missing_service_is_excluded_and_pom_restored_on_report_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pom = root / 'coverage-report/pom.xml'
            pom.parent.mkdir()
            original = '<project xmlns="http://maven.apache.org/POM/4.0.0"><dependencies>'
            for name in ['measured', 'missing']:
                original += f'<dependency><artifactId>{name}</artifactId></dependency>'
            original += '</dependencies></project>'
            pom.write_text(original)
            (root / 'maven-verify.log').write_text('[INFO] measured ........ FAILURE\n[INFO] missing ........ FAILURE\n')
            classes = root / 'measured/target/classes'
            classes.mkdir(parents=True)
            (classes / 'Example.class').write_bytes(b'class')
            (classes.parent / 'jacoco.exec').write_bytes(b'execution data')
            def run(*args, **kwargs):
                deps = ET.parse(pom).findall('m:dependencies/m:dependency', report.NS)
                self.assertEqual([d.findtext('m:artifactId', namespaces=report.NS) for d in deps], ['measured'])
                return type('Result', (), {'returncode': 1})()
            with patch.object(Path, 'cwd', return_value=root), patch.object(report.subprocess, 'run', side_effect=run):
                self.assertEqual(report.main(), 1)
            self.assertEqual(pom.read_text(), original)
            self.assertIn('| missing | FAILURE | Unavailable', (root / 'coverage-report/target/site/jacoco-aggregate/coverage-status.md').read_text())


if __name__ == '__main__':
    unittest.main()
