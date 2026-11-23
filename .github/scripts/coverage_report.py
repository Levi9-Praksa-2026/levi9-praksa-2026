"""Generate CI coverage from available data, explicitly reporting missing results."""
import html
import os
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

NS = {'m': 'http://maven.apache.org/POM/4.0.0'}
ET.register_namespace('', NS['m'])


def service_results(root):
    log = (root / 'maven-verify.log').read_text() if (root / 'maven-verify.log').exists() else ''
    services = ET.parse(root / 'coverage-report/pom.xml').findall('m:dependencies/m:dependency', NS)
    results = []
    for dependency in services:
        name = dependency.findtext('m:artifactId', namespaces=NS)
        target = root / name / 'target'
        match = re.search(r'\[\w+\]\s+' + re.escape(name) + r'\s+\.+\s+(SUCCESS|FAILURE|SKIPPED)', log)
        status = match[1] if match else 'UNKNOWN'
        data = target / 'jacoco.exec'
        available = data.exists() and data.stat().st_size > 0 and any((target / 'classes').rglob('*.class'))
        results.append({'name': name, 'status': status, 'available': available})
    return results


def write_summary(root, results, report_ok):
    report = root / 'coverage-report/target/site/jacoco-aggregate'
    report.mkdir(parents=True, exist_ok=True)
    xml = report / 'jacoco.xml'
    report_ok = report_ok and xml.exists() and (report / 'index.html').exists()
    try:
        groups = {g.get('name'): g for g in ET.parse(xml).findall('group')} if report_ok else {}
    except ET.ParseError:
        groups = {}
        report_ok = False
    rows = []
    for item in results:
        group = groups.get(item['name'])
        counter = group.find("counter[@type='LINE']") if group is not None else None
        if not item['available']:
            coverage = 'Unavailable (no execution data or compiled classes)'
        elif counter is None:
            coverage = 'Unavailable (report generation failed or no executable lines)'
        else:
            covered, missed = int(counter.get('covered')), int(counter.get('missed'))
            coverage = f'{100 * covered / (covered + missed):.1f}%' if covered + missed else 'N/A (no executable lines)'
            if item['status'] != 'SUCCESS':
                coverage += ' (partial / failed verification)'
        rows.append([item['name'], item['status'], coverage])
    note = ('Coverage includes only services with execution data and compiled classes. '
            'Unavailable coverage is not 0%. Results from failed verification may be partial; '
            'the combined percentage does not prove all services passed.')
    markdown = '## Backend coverage\n\n' + note + '\n\n| Service | Verification | Line coverage |\n| --- | --- | --- |\n'
    markdown += ''.join('| ' + ' | '.join(row) + ' |\n' for row in rows)
    (report / 'coverage-status.md').write_text(markdown)
    table = ''.join('<tr>' + ''.join('<td>' + html.escape(cell) + '</td>' for cell in row) + '</tr>' for row in rows)
    link = '<p><a href="index.html">Open combined JaCoCo report</a></p>' if report_ok else '<p>Combined report generation failed.</p>'
    status_html = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>Backend coverage status</title>'
        '<h1>Backend coverage status</h1><p>' + note + '</p>' + link + '<table border="1" cellpadding="8">'
        '<tr><th>Service</th><th>Verification</th><th>Line coverage</th></tr>' + table + '</table></html>')
    (report / 'coverage-status.html').write_text(status_html)
    index = report / 'index.html'
    if report_ok and index.exists():
        banner = ('<div style="padding:1em;border:2px solid #555"><h2>Service verification and coverage availability</h2>'
                  '<p>' + note + '</p><table border="1" cellpadding="8">'
                  '<tr><th>Service</th><th>Verification</th><th>Line coverage</th></tr>' + table + '</table></div>')
        index.write_text(re.sub(r'(<body[^>]*>)', lambda match: match[0] + banner, index.read_text(), count=1))
    else:
        # Do not leave an earlier successful report at the main entry point.
        index.write_text(status_html)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(markdown)
    print(markdown)
    return report_ok


def main():
    root = Path.cwd()
    results = service_results(root)
    pom = root / 'coverage-report/pom.xml'
    original = pom.read_bytes()
    tree = ET.fromstring(original)
    dependencies = tree.find('m:dependencies', NS)
    available = {item['name'] for item in results if item['available']}
    for dependency in list(dependencies):
        if dependency.findtext('m:artifactId', namespaces=NS) not in available:
            dependencies.remove(dependency)
    # Keep missing services out of JaCoCo's denominator instead of presenting them as 0%.
    pom.write_bytes(ET.tostring(tree, encoding='utf-8', xml_declaration=True))
    code = 1
    try:
        code = subprocess.run(['./mvnw', '-B', '--no-transfer-progress', '-pl', 'coverage-report', '-am',
            'org.jacoco:jacoco-maven-plugin:0.8.16:report-aggregate@aggregate-coverage'], check=False).returncode
    finally:
        pom.write_bytes(original)
        report_ok = write_summary(root, results, code == 0)
    return code or (0 if report_ok else 1)


if __name__ == '__main__':
    raise SystemExit(main())
